import { UNIT } from './balance';
/** Random decision events. Each option has explicit, visible consequences. */
export interface EventOption { textAr: string; money?: number; satisfaction?: number; reputation?: number; cleanliness?: number; visitors?: number; resultAr: string }
export interface EventDef { id: string; icon: string; titleAr: string; bodyAr: string; options: [EventOption, EventOption]; defaultOption: 0 | 1 }
export const EVENTS: EventDef[] = [
  { id: 'donation', icon: '🎁', titleAr: 'تبرّع بمجموعة كتب', bodyAr: 'أستاذ متقاعد يعرض إهداء مكتبته الشخصية للمكتبة المركزية.', defaultOption: 1,
    options: [
      { textAr: 'نقبل ونفهرسها (٣٠٬٠٠٠ د.ع)', money: -30 * UNIT, reputation: 3, satisfaction: 2, resultAr: 'أُضيفت الكتب المهداة إلى الرفوف. سمعة المكتبة ارتفعت.' },
      { textAr: 'نعتذر حالياً', resultAr: 'اعتذرنا عن التبرع. لا تغيير.' },
    ] },
  { id: 'noisy_group', icon: '🗣️', titleAr: 'مجموعة صاخبة', bodyAr: 'مجموعة طلبة يتناقشون بصوت عالٍ في منطقة المطالعة الهادئة.', defaultOption: 1,
    options: [
      { textAr: 'تنبيه لطيف وتوجيههم لمنطقة النقاش', satisfaction: 3, resultAr: 'عاد الهدوء. الطلبة القرّاء ممتنون.' },
      { textAr: 'تجاهل الموضوع', satisfaction: -5, resultAr: 'استمرّ الضجيج وانزعج القرّاء.' },
    ] },
  { id: 'ac_failure', icon: '🌡️', titleAr: 'عطل في التبريد', bodyAr: 'وحدة التبريد في القاعة توقفت والجو بدأ يسخن.', defaultOption: 1,
    options: [
      { textAr: 'صيانة فورية (٦٠٬٠٠٠ د.ع)', money: -60 * UNIT, satisfaction: 2, resultAr: 'أُصلح التبريد بسرعة.' },
      { textAr: 'ننتظر صيانة الجامعة', satisfaction: -8, resultAr: 'بقيت القاعة حارّة لساعات وغادر بعض الطلبة.' },
    ] },
  { id: 'club_event', icon: '🎤', titleAr: 'طلب من نادٍ طلابي', bodyAr: 'نادي القراءة يطلب إقامة أمسية ثقافية قصيرة في القاعة.', defaultOption: 1,
    options: [
      { textAr: 'نوافق ونستضيفهم', visitors: 5, reputation: 2, cleanliness: -8, resultAr: 'أمسية ناجحة وزوّار أكثر، لكن القاعة تحتاج تنظيفاً.' },
      { textAr: 'نعتذر للحفاظ على الهدوء', resultAr: 'بقيت القاعة هادئة.' },
    ] },
];
export const EVENT_BY_ID = Object.fromEntries(EVENTS.map((e) => [e.id, e]));
export const ACHIEVEMENTS = [
  { id: 'first_service', icon: '🥇', titleAr: 'أول خدمة', descAr: 'خدمت أول طالب', test: (t: any) => t.totals.served >= 1 },
  { id: 'served_50', icon: '📚', titleAr: 'خمسون خدمة', descAr: '٥٠ خدمة منجزة', test: (t: any) => t.totals.served >= 50 },
  { id: 'served_200', icon: '🏅', titleAr: 'مكتبة لا تهدأ', descAr: '٢٠٠ خدمة منجزة', test: (t: any) => t.totals.served >= 200 },
  { id: 'million', icon: '💰', titleAr: 'أول مليون', descAr: 'إجمالي الإيرادات مليون دينار', test: (t: any) => t.totals.earned >= 1_000_000 },
  { id: 'full_team', icon: '👥', titleAr: 'فريق متكامل', descAr: 'الوظائف الخمس مشغولة', test: (t: any) => t.staff.length >= 5 },
  { id: 'spotless', icon: '✨', titleAr: 'نظافة مثالية', descAr: 'نظّفت ٢٥ بقعة', test: (t: any) => t.totals.cleaned >= 25 },
  { id: 'dewey_master', icon: '🔢', titleAr: 'خبير التصنيف', descAr: '٦ من ٦ في تصنيف ديوي', test: (t: any) => t.totals.deweyBest >= 6 },
  { id: 'five_stars', icon: '⭐', titleAr: 'خمس نجوم', descAr: 'سمعة ٤٫٨ أو أكثر', test: (t: any) => t.reputation >= 4.8 },
  { id: 'main_story', icon: '🎓', titleAr: 'مدير متمكّن', descAr: 'أكملت كل المهمات الرئيسية', test: (t: any) => ['missing_book','guide_student','rush_ten','dewey_sort','find_reference','exam_week','vip_visit'].every((m) => t.missions.completed[m]) },
  { id: 'guardian_friend', icon: '🎁', titleAr: 'صديق الحارس الصغير', descAr: 'استلمت هدية الحارس ٥ مرات', test: (t: any) => t.mascot.rewardsClaimed >= 5 },
];
