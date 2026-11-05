الشعاران الأصليان فقط. لا تضع صوراً مُولّدة أو مُعدّلة هنا.

انسخ الشعار الرسمي الأصلي للجامعة والشعار الرسمي الأصلي للمكتبة بصيغة PNG أو WebP أو SVG إلى هذا المجلد.
ثم عدّل tycoon_brand_assets.js في مجلد V22 بحيث تكتب، مثلاً:
window.LT_APPROVED_BRAND_ASSETS = { university: 'assets/branding/uot-original.png', library: 'assets/branding/library-original.png' };

هذا الإعداد اختياري. إذا بقي null تظهر أسماء المؤسستين كتابةً فقط، ولا تُطلب ملفات غير موجودة.
تأكد من صحة النصوص الأصلية، والألوان، والتفاصيل. لا قص ولا تغيير.
