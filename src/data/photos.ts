/** 画面で使う写真（提供された画像）。保存データには入れず、コースの id で対応づける。 */
import driedFlowers from '../assets/photos/dried-flowers.jpg'
import shampoo from '../assets/photos/shampoo.jpg'
import bobHair from '../assets/photos/bob-hair.jpg'

/** 予約の詳細パネルの上部の写真 */
export const DETAIL_HERO_PHOTO = driedFlowers

/** 予約画面（プレビュー）のコース選択の写真 */
export const COURSE_PHOTO: Record<string, string> = {
  'c-spa': driedFlowers, // ヘッドスパ
  'c-cut': shampoo, // カット
  'c-color': bobHair, // カラー
}
