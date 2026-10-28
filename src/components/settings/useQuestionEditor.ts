import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { createQuestion, newId, type Question, type QuestionType } from '../../data/booking'

export const FIELD = {
  label: 'f-question-label',
  help: 'f-question-help',
  option: (id: string) => `f-option-${id}`,
}

const move = <T,>(arr: T[], from: number, to: number): T[] => {
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr
  const next = [...arr]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

/**
 * 「お客様への質問項目」の編集状態。
 * 質問そのものは親（予約設定ページ）が持ち、変更のたびにブラウザへ保存する（②のメモとは別キー）。
 */
export function useQuestionEditor(questions: Question[], setQuestions: Dispatch<SetStateAction<Question[]>>) {
  const [selected, setSelected] = useState<string | null>(null) // 既存の画面と同じく、最初は未選択
  const [helpOpen, setHelpOpen] = useState<Record<string, boolean>>({})
  const [focusField, setFocusField] = useState<{ id: string; nonce: number } | null>(null)
  const nonce = useRef(0)

  const requestFocus = useCallback((id: string) => setFocusField({ id, nonce: ++nonce.current }), [])

  const patch = useCallback((id: string, p: Partial<Question>) => setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...p } : q))), [])

  const addQuestion = useCallback(
    (type: QuestionType) => {
      const q = createQuestion(type)
      setQuestions((qs) => [...qs, q])
      setSelected(q.id)
      requestFocus(FIELD.label)
    },
    [requestFocus],
  )

  const removeQuestion = useCallback((id: string) => {
    setQuestions((qs) => qs.filter((q) => q.id !== id))
    setSelected((s) => (s === id ? null : s))
  }, [])

  const moveQuestion = useCallback((from: number, to: number) => setQuestions((qs) => move(qs, from, to)), [])

  const addOption = useCallback(
    (qid: string) => {
      const oid = newId('o')
      setQuestions((qs) => qs.map((q) => (q.id === qid ? { ...q, options: [...q.options, { id: oid, label: '' }] } : q)))
      requestFocus(FIELD.option(oid))
    },
    [requestFocus],
  )
  const updateOption = useCallback(
    (qid: string, oid: string, label: string) =>
      setQuestions((qs) => qs.map((q) => (q.id === qid ? { ...q, options: q.options.map((o) => (o.id === oid ? { ...o, label } : o)) } : q))),
    [],
  )
  const removeOption = useCallback(
    (qid: string, oid: string) => setQuestions((qs) => qs.map((q) => (q.id === qid ? { ...q, options: q.options.filter((o) => o.id !== oid) } : q))),
    [],
  )
  const moveOption = useCallback(
    (qid: string, from: number, to: number) => setQuestions((qs) => qs.map((q) => (q.id === qid ? { ...q, options: move(q.options, from, to) } : q))),
    [],
  )

  const toggleHelp = useCallback(
    (id: string, open: boolean) => {
      setHelpOpen((h) => ({ ...h, [id]: open }))
      if (open) requestFocus(FIELD.help)
    },
    [requestFocus],
  )

  return {
    questions,
    selected,
    setSelected,
    helpOpen,
    toggleHelp,
    focusField,
    patch,
    addQuestion,
    removeQuestion,
    moveQuestion,
    addOption,
    updateOption,
    removeOption,
    moveOption,
  }
}

export type QuestionEditor = ReturnType<typeof useQuestionEditor>
