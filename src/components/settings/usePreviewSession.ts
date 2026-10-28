import { useCallback, useEffect, useReducer, useRef } from 'react'
import type { BookingSettings, QuestionType } from '../../data/booking'
import {
  SAMPLE_SLOT,
  stepsFor,
  type AnswerEntry,
  type Slot,
  type StepId,
} from '../../lib/booking'

/**
 * プレビュー内の仮入力・選択内容（保存済み設定・編集中の設定とは別に管理する）。
 * ①の予約データ・②のメモには一切書き込まない。
 */
export interface Session {
  step: StepId
  courseId: string | null
  staffId: string | null
  slot: Slot | null
  answers: Record<string, AnswerEntry>
  agreed: boolean
  errors: { course?: string; staff?: string; slot?: string; agree?: string; questions: Record<string, string> }
  /** ステップ直接移動で、サンプル値を補った項目 */
  sampled: { course: boolean; staff: boolean; slot: boolean }
  /** プレビュー内の操作で画面が変わったときだけ増やす（見出しへフォーカスを移す合図） */
  focusNonce: number
}

const initial = (focusNonce = 0): Session => ({
  step: 'top',
  courseId: null,
  staffId: null,
  slot: null,
  answers: {},
  agreed: false,
  errors: { questions: {} },
  sampled: { course: false, staff: false, slot: false },
  focusNonce,
})

type Action =
  | { type: 'next'; settings: BookingSettings }
  | { type: 'back'; settings: BookingSettings }
  | { type: 'confirm'; settings: BookingSettings }
  | { type: 'goTo'; step: StepId; settings: BookingSettings; focus: boolean }
  | { type: 'setStep'; step: StepId }
  | { type: 'reset' }
  | { type: 'restart'; settings: BookingSettings }
  | { type: 'enter'; step: StepId; settings: BookingSettings }
  | { type: 'course'; id: string }
  | { type: 'staff'; id: string }
  | { type: 'slot'; slot: Slot }
  | { type: 'answer'; id: string; entry: AnswerEntry }
  | { type: 'agree'; value: boolean }
  | { type: 'prune'; settings: BookingSettings }

const courseValid = (s: BookingSettings, id: string | null) => id !== null && s.courses.some((c) => c.id === id)
const staffValid = (s: BookingSettings, id: string | null) => id !== null && s.staff.members.some((m) => m.id === id)

function reducer(state: Session, a: Action): Session {
  switch (a.type) {
    case 'next':
    case 'back': {
      const steps = stepsFor(a.settings)
      const cur = steps.includes(state.step) ? state.step : 'course'
      const idx = steps.indexOf(cur)
      if (a.type === 'back') {
        return { ...state, step: steps[Math.max(0, idx - 1)], errors: { questions: {} }, focusNonce: state.focusNonce + 1 }
      }
      // プレビューは確認用なので、必須項目が空でも先へ進める（入力チェックはしない）
      return { ...state, step: steps[Math.min(steps.length - 1, idx + 1)], errors: { questions: {} }, focusNonce: state.focusNonce + 1 }
    }
    case 'confirm': {
      if (a.settings.terms.showConsent && !state.agreed) {
        return { ...state, errors: { questions: {}, agree: '利用規約への同意が必要です' } }
      }
      return { ...state, step: 'done', errors: { questions: {} }, focusNonce: state.focusNonce + 1 }
    }
    case 'goTo': {
      // 設定確認用のショートカット：必要なコース・スタッフ・日時が未選択ならサンプルを補う
      const steps = stepsFor(a.settings)
      const target = steps.includes(a.step) ? a.step : 'course'
      const ti = steps.indexOf(target)
      const next: Session = { ...state, step: target, errors: { questions: {} }, sampled: { ...state.sampled } }
      if (ti > steps.indexOf('course') && !courseValid(a.settings, next.courseId) && a.settings.courses.length > 0) {
        next.courseId = a.settings.courses[0].id
        next.sampled.course = true
      }
      const si = steps.indexOf('staff')
      if (si >= 0 && ti > si && !staffValid(a.settings, next.staffId)) {
        next.staffId = a.settings.staff.members[0].id
        next.sampled.staff = true
      }
      if (ti > steps.indexOf('datetime') && !next.slot) {
        next.slot = SAMPLE_SLOT
        next.sampled.slot = true
      }
      if (a.focus) next.focusNonce = state.focusNonce + 1
      return next
    }
    case 'setStep':
      return state.step === a.step ? state : { ...state, step: a.step }
    case 'reset':
      return initial(state.focusNonce + 1)
    case 'restart': {
      // 「トークに戻る」：予約の最初の画面（トップ画面。非表示の設定ならコース選択）へ戻り、入力は消す
      const steps = stepsFor(a.settings)
      return { ...initial(state.focusNonce + 1), step: steps[0] }
    }
    case 'enter': {
      // 編集する画面が切り替わったときに、その設定を確認できる画面へ移す（フォーカスは奪わない）
      const steps = stepsFor(a.settings)
      const step = steps.includes(a.step) ? a.step : steps[0]
      return {
        ...state,
        step,
        courseId: state.courseId ?? a.settings.courses[0]?.id ?? null,
        slot: state.slot ?? SAMPLE_SLOT,
        errors: { questions: {} },
      }
    }
    case 'course':
      return { ...state, courseId: a.id, sampled: { ...state.sampled, course: false }, errors: { ...state.errors, course: undefined } }
    case 'staff':
      return { ...state, staffId: a.id, sampled: { ...state.sampled, staff: false }, errors: { ...state.errors, staff: undefined } }
    case 'slot':
      return { ...state, slot: a.slot, sampled: { ...state.sampled, slot: false }, errors: { ...state.errors, slot: undefined } }
    case 'answer': {
      const qErrors = { ...state.errors.questions }
      delete qErrors[a.id]
      return { ...state, answers: { ...state.answers, [a.id]: a.entry }, errors: { ...state.errors, questions: qErrors } }
    }
    case 'agree':
      return { ...state, agreed: a.value, errors: { ...state.errors, agree: undefined } }
    case 'prune': {
      // 削除された質問の仮回答は消す。回答形式が変わった質問は、その質問の回答だけをリセットする
      let changed = false
      const answers: Record<string, AnswerEntry> = {}
      for (const [id, entry] of Object.entries(state.answers)) {
        const q = a.settings.questions.find((x) => x.id === id)
        if (q && q.type === entry.type) answers[id] = entry
        else changed = true
      }
      const qErrors: Record<string, string> = {}
      for (const [id, msg] of Object.entries(state.errors.questions)) {
        if (a.settings.questions.some((x) => x.id === id)) qErrors[id] = msg
        else changed = true
      }
      const courseId = courseValid(a.settings, state.courseId) ? state.courseId : null
      const staffId = staffValid(a.settings, state.staffId) ? state.staffId : null
      if (courseId !== state.courseId || staffId !== state.staffId) changed = true
      if (!changed) return state
      return { ...state, answers, courseId, staffId, errors: { ...state.errors, questions: qErrors } }
    }
  }
}

export type PreviewSession = ReturnType<typeof usePreviewSession>

export function usePreviewSession(settings: BookingSettings, initialStep: StepId) {
  // 初期表示は編集中の画面に対応する画面。必要なコース・日時は内部的に固定のサンプル値を入れておく
  const [state, dispatch] = useReducer(reducer, undefined, (): Session => ({
    ...initial(),
    step: stepsFor(settings).includes(initialStep) ? initialStep : stepsFor(settings)[0],
    courseId: settings.courses[0]?.id ?? null,
    slot: SAMPLE_SLOT,
  }))
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  // 設定（質問・コース・スタッフ）が変わったら、使えなくなった仮入力を整理する
  useEffect(() => {
    dispatch({ type: 'prune', settings })
  }, [settings])

  // スタッフ選択をOFFにした等で、いま表示中のステップが無くなったらコース選択へ（フォーカスは奪わない）
  const steps = stepsFor(settings)
  const stepMissing = !steps.includes(state.step)
  useEffect(() => {
    if (stepMissing) dispatch({ type: 'setStep', step: 'course' })
  }, [stepMissing])

  return {
    state,
    steps,
    next: useCallback(() => dispatch({ type: 'next', settings: settingsRef.current }), []),
    back: useCallback(() => dispatch({ type: 'back', settings: settingsRef.current }), []),
    confirm: useCallback(() => dispatch({ type: 'confirm', settings: settingsRef.current }), []),
    /** focus=true：プレビュー内の操作（見出しへフォーカス）／false：編集側からの移動（フォーカスは奪わない） */
    goTo: useCallback((step: StepId, focus: boolean) => dispatch({ type: 'goTo', step, settings: settingsRef.current, focus }), []),
    enter: useCallback((step: StepId) => dispatch({ type: 'enter', step, settings: settingsRef.current }), []),
    restart: useCallback(() => dispatch({ type: 'restart', settings: settingsRef.current }), []),
    reset: useCallback(() => dispatch({ type: 'reset' }), []),
    selectCourse: useCallback((id: string) => dispatch({ type: 'course', id }), []),
    selectStaff: useCallback((id: string) => dispatch({ type: 'staff', id }), []),
    selectSlot: useCallback((slot: Slot) => dispatch({ type: 'slot', slot }), []),
    setAnswer: useCallback((id: string, type: QuestionType, value: string | string[]) => dispatch({ type: 'answer', id, entry: { type, value } }), []),
    setAgreed: useCallback((value: boolean) => dispatch({ type: 'agree', value }), []),
  }
}
