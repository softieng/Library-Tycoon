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
  { id: 'exam_seat_surge', icon: '📖', titleAr: 'مقاعد الامتحانات', bodyAr: 'طلبة أكثر من المتوقع وصلوا للمطالعة قبل الامتحانات. لازم تختار كيف تستوعبهم.', defaultOption: 1,
    options: [
      { textAr: 'نجهز مقاعد إضافية مؤقتة (٤٥٬٠٠٠ د.ع)', money: -45 * UNIT, satisfaction: 5, visitors: 3, cleanliness: -2, resultAr: 'دخل طلبة أكثر واستفادوا من مساحة المطالعة المؤقتة.' },
      { textAr: 'ننظم الدخول حسب المقاعد المتاحة', satisfaction: -3, resultAr: 'الانتظار طال، لكن القاعة بقيت ضمن طاقتها الحالية.' },
    ] },
  { id: 'rare_books', icon: '📜', titleAr: 'مجموعة كتب نادرة', bodyAr: 'وصلت مجموعة كتب نادرة تحتاج حفظاً وفهرسة قبل عرضها للزوار.', defaultOption: 1,
    options: [
      { textAr: 'نمول تجهيزها وفهرستها (٥٠٬٠٠٠ د.ع)', money: -50 * UNIT, reputation: 4, satisfaction: 2, resultAr: 'المجموعة صارت متاحة للاطلاع وارتفعت مكانة المكتبة.' },
      { textAr: 'نؤجل العرض إلى حين توفر الميزانية', reputation: -1, resultAr: 'الكتب محفوظة، لكن الزوار ما استفادوا منها اليوم.' },
    ] },
  { id: 'student_exhibition', icon: '🧑‍🎓', titleAr: 'معرض مشاريع الطلبة', bodyAr: 'مجموعة طلبة تريد تعرض ابتكاراتها داخل المكتبة وتدعو زملاءها.', defaultOption: 1,
    options: [
      { textAr: 'نخصص ركناً للمعرض (٣٥٬٠٠٠ د.ع)', money: -35 * UNIT, visitors: 4, reputation: 3, cleanliness: -5, resultAr: 'المعرض جذب زواراً جدداً، والمكان يحتاج ترتيباً بعد النشاط.' },
      { textAr: 'نختار موعداً آخر', satisfaction: -2, resultAr: 'تأجل المعرض، وبقيت القاعة هادئة.' },
    ] },
  { id: 'internet_interruption', icon: '📡', titleAr: 'انقطاع اتصال خارجي', bodyAr: 'فُقد اتصال الإنترنت الخارجي، لكن الفهرس المحلي والخدمات الداخلية ما زالت تعمل.', defaultOption: 1,
    options: [
      { textAr: 'نساعد الطلاب باستخدام الفهرس المحلي', satisfaction: 3, reputation: 1, resultAr: 'الطلبة واصلوا البحث بالفهرس المحلي رغم انقطاع الإنترنت.' },
      { textAr: 'نوقف المساعدة حتى يعود الإنترنت', satisfaction: -6, resultAr: 'ازدادت شكاوى الطلبة بسبب توقف المساعدة.' },
    ] },
  { id: 'computer_queue', icon: '⌨️', titleAr: 'ازدحام على الحاسبات', bodyAr: 'الطلبة يتزاحمون على الحاسبات قبل تسليم مشاريعهم.', defaultOption: 1,
    options: [
      { textAr: 'نفتح جلسات قصيرة بإشراف الموظف', satisfaction: 4, reputation: 1, resultAr: 'الدور صار أوضح والطلبة أنهوا بحثهم بأقل انتظار.' },
      { textAr: 'نترك الأسبقية لأول الواصلين', satisfaction: -4, resultAr: 'طالت طوابير الحاسبات وازدادت الشكاوى.' },
    ] },
  { id: 'campus_library_tour', icon: '🚌', titleAr: 'جولة طلبة جدد', bodyAr: 'وصل فوج تعريفي من الطلبة الجدد ويريد جولة بين خدمات المكتبة.', defaultOption: 1,
    options: [
      { textAr: 'نستقبل الجولة مع الحارس الصغير', visitors: 6, reputation: 2, cleanliness: -5, resultAr: 'تعرّف الطلبة إلى الخدمات وصارت المكتبة أكثر حيوية.' },
      { textAr: 'نكتفي بإرشادهم من مكتب الاستعلامات', satisfaction: -1, resultAr: 'الجولة كانت مختصرة وخرج بعض الطلبة من دون رؤية القاعة.' },
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
  { id: 'visitor_hundred', icon: '🎒', titleAr: 'مئة زائر', descAr: 'استقبلت ١٠٠ زائر', test: (t: any) => t.totals.visitors >= 100 },
  { id: 'reader_space', icon: '🪑', titleAr: 'قاعة أوسع', descAr: 'طورت مساحة المطالعة', test: (t: any) => t.upgrades.includes('reading_hall') },
  { id: 'research_ready', icon: '🔬', titleAr: 'العمل البحثي', descAr: 'طورت رفوف الخوارزمي لخدمة البحث', test: (t: any) => t.upgrades.includes('shelves_khwarizmi') },
  { id: 'technical_rescuer', icon: '🛠️', titleAr: 'حلّال المشاكل', descAr: 'أصلحت ٥ أجهزة', test: (t: any) => t.totals.repaired >= 5 },
];
