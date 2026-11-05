# تجربة Library Tycoon V2.5 من المتصفح

الكود مرفوع على فرع `development/v25-director-mode`. تم التحقق من نجاح اختبارات GitHub Actions، كما اجتازت واجهة WebGL الأساسية فحص تشغيل محلي باستخدام Chromium دون أخطاء JavaScript.

## تفعيل عرض GitHub Pages

1. افتح `https://github.com/softieng/Library-Tycoon/settings/pages` وسجّل الدخول إلى GitHub.
2. من **Build and deployment** اختر **Deploy from a branch**.
3. اختر الفرع `development/v25-director-mode` والمجلد `/(root)`، ثم اضغط **Save**.
4. انتظر حتى يظهر عنوان الموقع الرسمي في **Settings → Pages**، ثم افتحه من هناك.

هذا المستودع حالياً Public، لذلك ستكون صفحة التجربة عامة أيضاً.

## حدود النسخة الحالية

- تشغيل WebGL الأساسي يعمل حتى مع غياب مكتبات Babylon.js. جرى فحص عرض الواجهة محلياً من دون أخطاء JavaScript.
- نسخة Babylon.js عالية الجودة تحتاج مكتبة المحرك الأصلية، `fixed_tycoon_camera.js`، ملفات النماذج والمواد والإضاءة الأصلية.
- شعار الجامعة وشعار المكتبة المركزية الرسميان غير مرفوعين هنا. لا نولّد شعارات بديلة ولا نعدّل النسخ الأصلية، ويجب إدراج الملفات المعتمدة كما هي بعد مراجعة المالك.
- لا تعتمد على هذا الفرع بوصفه نسخة إنتاجية أو لعبة نهائية.
- لا حاجة لتنزيل أي ملف لتجربة الموقع بعد نشر GitHub Pages.

المصدر: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
