# Arab tili fonetika web app brief

Bu loyihada web app quriladi.

Manba:
- Lug'atlar PDFdan olinadi:
  /Users/ikrom/Desktop/Kitoblar/العربية/اللغة/المطالعة/Shifohiya/lug'atlar/shifohiyya 1_lug'ati (1).pdf
- PDF nomi: Shifohiyya 1 lug'ati.
- PDF 34 sahifadan iborat.

Reja:
- Web app uchun kod yozish.
- Appni lokalda tekshirish.
- Vercel uchun build tayyorlash.
- Vercelga deploy/upload qilish.
- Postgres (Neon) orqali user, progress va lug'at ma'lumotlarini saqlash.
- Boshlanishida PDFdagi dastlabki 10 ta dars lug'atlari asosida 10 ta darajali o'yin tuzish.

Tanlangan arxitektura:
- Frontend va deploy: Vercel.
- Database va auth: Postgres (Neon), `pg` orqali `api/` ichidagi serverless funksiyalardan ulanadi.
- Boshlanishi: Neon Free plan bilan MVP.

Boshlang'ich database g'oyasi:
- users: foydalanuvchi profili.
- levels: bosqichlar/darajalar. MVP boshida 10 ta daraja bo'ladi; keyin 100 tagacha kengaytiriladi.
- lessons: PDFdagi darslar. Har bir dars bitta levelga bog'lanadi.
- words: dars va darajalarga bog'langan arabcha so'zlar va ularning o'zbekcha ma'nolari.
- user_progress: user qaysi levelgacha yetgani, score, streak.
- user_word_stats: har bir so'z bo'yicha xato/to'g'ri javoblar va takrorlash holati.
- user_events: admin statistika uchun login, level_started, level_completed, word_answered_correct, word_answered_wrong kabi eventlar.

MVP o'yin modeli:
- 1-dars = 1-level.
- 2-dars = 2-level.
- Shu tartibda 10-dars = 10-level.
- Har levelda shu darsdagi lug'atlar bo'yicha mashqlar bo'ladi.
- Mashq turlari: arabchadan o'zbekchasini topish, o'zbekchadan arabchasini topish, xato javoblarni qayta takrorlash.
- Level yakunida score, to'g'ri javoblar, xatolar va keyingi level ochilishi saqlanadi.

Eslatma:
- Appning aniq funksiyalari, dizayni va sahifalari keyin belgilanadi.
- Deploydan oldin build va asosiy foydalanuvchi oqimi tekshiriladi.
- PDFdan matn avtomatik chiqmasa, OCR yoki qo'lda tekshirilgan import jadvali orqali lug'atlar bazaga kiritiladi.

Qoida:
- Yangi bosqichlar qo'shilganda mavjud bosqichlar o'zgarishsiz qoladi.
- Eski bosqichlarning lug'atlari, jumlalari, tartibi, level raqami, seed ma'lumotlari va migratsiya ma'lumotlari avtomatik tahrirlanmaydi.
- Postgres seed yoki migration yozilganda yangi bosqichlar append-only usulida qo'shiladi; mavjud bosqichlar uchun umumiy delete/update ishlatilmaydi.
- Agar eski bosqichdan biror narsa o'zgarishi kerak bo'lsa, faqat foydalanuvchi aniq aytgandan keyin o'zgartiriladi.
