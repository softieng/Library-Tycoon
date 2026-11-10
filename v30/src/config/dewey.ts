/** Dewey Decimal Classification main classes, used by shelves, missions and the mini-game. */
export interface DeweyClass { code: string; nameAr: string; color: string }
export const DEWEY: DeweyClass[] = [
  { code: '000', nameAr: 'المعارف العامة وعلوم الحاسوب', color: '#3b5b8c' },
  { code: '100', nameAr: 'الفلسفة وعلم النفس', color: '#7a5c99' },
  { code: '200', nameAr: 'الديانات', color: '#4f8a6b' },
  { code: '300', nameAr: 'العلوم الاجتماعية', color: '#b5653a' },
  { code: '400', nameAr: 'اللغات', color: '#c2933a' },
  { code: '500', nameAr: 'العلوم الطبيعية والرياضيات', color: '#2f7f8f' },
  { code: '600', nameAr: 'التكنولوجيا والعلوم التطبيقية', color: '#a8443f' },
  { code: '700', nameAr: 'الفنون والعمارة', color: '#b0567f' },
  { code: '800', nameAr: 'الآداب', color: '#5d7d3a' },
  { code: '900', nameAr: 'التاريخ والجغرافيا', color: '#8a6a45' },
];
export interface BookCard { title: string; code: string }
export const BOOKS: BookCard[] = [
  { title: 'مقدمة في الخوارزميات وهياكل البيانات', code: '000' },
  { title: 'أساسيات الذكاء الاصطناعي', code: '000' },
  { title: 'علم الفهرسة والمكتبات', code: '000' },
  { title: 'مدخل إلى المنطق', code: '100' },
  { title: 'علم النفس التربوي', code: '100' },
  { title: 'علوم القرآن', code: '200' },
  { title: 'مبادئ الاقتصاد', code: '300' },
  { title: 'القانون الدستوري', code: '300' },
  { title: 'قواعد اللغة العربية', code: '400' },
  { title: 'معجم المصطلحات الهندسية (إنكليزي – عربي)', code: '400' },
  { title: 'التفاضل والتكامل', code: '500' },
  { title: 'الفيزياء العامة', code: '500' },
  { title: 'الكيمياء العضوية', code: '500' },
  { title: 'هندسة السيطرة والنظم', code: '600' },
  { title: 'مقاومة المواد', code: '600' },
  { title: 'الإلكترونيات الرقمية', code: '600' },
  { title: 'تاريخ العمارة الإسلامية', code: '700' },
  { title: 'أسس التصميم المعماري', code: '700' },
  { title: 'ديوان المتنبي', code: '800' },
  { title: 'الرواية العراقية الحديثة', code: '800' },
  { title: 'تاريخ بغداد', code: '900' },
  { title: 'جغرافية العراق', code: '900' },
];
