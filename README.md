# أملِ
أملِ نموذج أولي لمدرّب إملائي ذكي يذلل صعاب الإملاء ويقرّبه للمتعلم من خلال تمرينات وألعاب مختلفة مثل الاستماع والصور والأسئلة والأعداد.


## عرض

النسخة التجريبية: https://amly.app

المحلل النصي (تحت الاختبار): https://amly.app/trainer


## آليات
يأخذ نموذج محرك الألعاب التالي (js/app.js):
- تصميم داعم للأجهزة الذكية (هواتف، ألواح، حواسيب) مع تصميم
- آليات للتلعيب gamification والمحاولة والتقييم scoring & leveling.
- حفظ البيانات على المتصفح Data Persistence بحيث لا يضيع تقدمه في التدريب الذي شرع فيه.
- آليات لتوليد ألعاب مختلفة: صورية-نصية-صوتية-اختيارية، إضافة إلى أنه يستطيع استدعاء واجهة برمجية لتوليد صور بشكل آلي من مستودعات الصور أو توظيف قراءة نصية آلية TTS.
- دعم اختصارات لوحة المفاتيح كبداية لتهيئة توافقية مع برمجية قراءة الشاشة للمكفوفي.

أما في معالجة النص، فنعتمد على:
-  خوارزميات في المقارنة النصية لحل ما يعرف بمشكل "أطول تسلسل مشترك" common subsequence problem، وذلك اعتمادا على حل ماير Myers diff algorithm (js/diff_match_patch.js).
- ترجمة بعض قوعد وأخطاء الإملاء الشائعة (js/ruleset.js) إلى شكل جديد.
- أضفنا معالجة نصية (js/engine.js) على مستويات متعددة تعمل على تقسيم النص إلى أجزاء وكلمات لتحديد محل الخطأ ومقارنة التشكيل ومقارنة Lemma والاستعانة بالبيانات الصرفية، لتدقيق الأخطاء.
- تتبع وحفظ أنماط الأخطاء patterns والكلمات التي يتردد إخطاء المستخدم فيها، وهذا لمعالجتها

أما الواجهة فتعتمد مكتبات:
- alpinejs
- tailwindcss
- animejs


# Amly


Amly is a word game dedicated for Arabic spelling and orthography, it provides various training through dictation and games.

The Serverside implementation can be found on https://github.com/drhootch/amlee-serverdemo

This fontend uses primarily the following libs:

- alpinejs
- tailwindcss
- animejs

## Demo:

Amly : https://amly.app/

Trainer (dev) https://amly.app/trainer
