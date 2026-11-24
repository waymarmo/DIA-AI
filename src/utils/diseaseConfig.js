import { COLORS } from '../constants/theme';

export const DISEASE_CONFIG = {
    'Diabet': {
        key: 'diabet',
        title: 'Diabet',
        titleRu: 'Диабет',
        titleEn: 'Diabetes',
        icon: 'water-outline',
        color: '#4A9EFF',
        chartTitle: "Qondagi qand (mg/dL)",
        chartTitleRu: "Сахар в крови (мг/дл)",
        chartTitleEn: "Blood Glucose (mg/dL)",
        metrics: [
            { key: 'sugar', label: 'Glyukoza', labelEn: 'Blood Sugar', labelRu: 'Глюкоза', unit: 'mg/dL', icon: 'water-outline', color: '#4A9EFF', defaultVal: '' },
            { key: 'insulin', label: 'Insulin/Dori', labelEn: 'Insulin/Medication', labelRu: 'Инсулин/Лекарство', unit: 'birlik', icon: 'medical-outline', color: '#A78BFA', defaultVal: '' },
            { key: 'carbs', label: 'Uglevod', labelEn: 'Carbohydrates', labelRu: 'Углеводы', unit: 'g', icon: 'restaurant-outline', color: '#FB923C', defaultVal: '' }
        ],
        limits: {
            sugar: { low: 70, normalMin: 70, normalMax: 140, high: 180, critical: 250 }
        },
        diet: {
            name: "Diabetik parhez (Kam uglevodli)",
            nameRu: "Диабетическая диета (Низкоуглеводная)",
            nameEn: "Diabetic Low-Carb Diet",
            tags: ['diabet', 'low_gi', 'kam_shakar'],
            allowedFoods: ["Ko'katlar va brokkoli", "Tuxum va tovuq go'shti", "Suli va grechka", "Yong'oqlar", "Avokado"],
            restrictedFoods: ["Shakar va shirinliklar", "Oq non va pishiriqlar", "Gazlangan shirin ichimliklar", "Juda shirin mevalar (uzum, anjir)"],
            allowedFoodsRu: ["Зелень и брокколи", "Яйца и куриная грудка", "Овсянка и гречка", "Орехи", "Авокадо"],
            allowedFoodsEn: ["Greens & broccoli", "Eggs & chicken breast", "Oats & buckwheat", "Nuts", "Avocado"],
            restrictedFoodsRu: ["Сахар и сладости", "Белый хлеб и выпечка", "Сладкие газировки", "Сладкие фрукты (виноград, инжир)"],
            restrictedFoodsEn: ["Sugar & sweets", "White bread & pastries", "Sugary sodas", "High-glycemic fruits (grapes, figs)"],
            tipUz: "Uglevodlarni me'yorida taqsimlang, ovqatdan so'ng 15 daqiqa piyoda yuring.",
            tipRu: "Контролируйте углеводы, гуляйте 15 минут после еды.",
            tipEn: "Balance carbohydrates evenly and walk 15 minutes after meals."
        },
        medications: {
            diseaseKey: 'diabet',
            quickMeds: [
                { name: 'Metformin', dose: '500 mg', time: 'ertalab_kechqurun', meal: 'ovqatdan_keyin', color: '#4A9EFF' },
                { name: 'Glimepirid', dose: '2 mg', time: 'ertalab', meal: 'ovqatdan_oldin', color: '#00E676' },
                { name: 'Sitagliptin', dose: '100 mg', time: 'ertalab', meal: 'ovqat_paytida', color: '#A78BFA' },
                { name: 'Dapagliflozin', dose: '10 mg', time: 'ertalab', meal: 'farqi_yoq', color: '#FFA726' },
                { name: 'Insulin (Lantus)', dose: '10 birlik', time: 'yotishdan_oldin', meal: 'farqi_yoq', color: '#FF5252' },
            ]
        },
        exercises: [
            {
                id: 'ex-diabet-1',
                title: "Ovqatdan keyingi sokin yurish",
                titleRu: "Прогулка после еды",
                titleEn: "Post-meal brisk walking",
                duration: 20,
                calories: 85,
                intensity: "Yengil",
                icon: "walk-outline",
                color: "#00E676",
                descUz: "Ovqatdan 30 daqiqa keyin sokin sur'atda piyoda yurish glyukoza keskin ko'tarilishini 30-40% ga kamaytiradi.",
                descRu: "Спокойная ходьба через 30 мин после еды снижает пики сахара на 30-40%.",
                descEn: "A relaxed 30-min post-meal walk reduces blood glucose spikes by 30-40%.",
                safetyTipUz: "Yonida konfet yoki qand bo'lsin (gipoglikemiya ehtimoli uchun).",
                safetyTipRu: "Держите конфету или сахар под рукой на случай гипогликемии.",
                safetyTipEn: "Keep candies or sweets nearby in case of hypoglycemia.",
                intensityEn: "Light",
                intensityRu: "Лёгкая"
            },
            {
                id: 'ex-diabet-2',
                title: "Oyoq venalari va boldir mashqlari",
                titleRu: "Упражнения для стоп и голеней",
                titleEn: "Calf and foot circulation exercise",
                duration: 15,
                calories: 50,
                intensity: "Yengil",
                icon: "body-outline",
                color: "#4A9EFF",
                descUz: "Diabetik tovon va mikrosirkulyatsiyani yaxshilash uchun o'tirgan holda oyoq barmoqlarini qimirlatish va boldirni cho'zish.",
                descRu: "Улучшает микроциркуляцию стоп для профилактики диабетической стопы.",
                descEn: "Seated toe wiggles and calf stretches to boost foot microcirculation and prevent diabetic foot complications.",
                safetyTipUz: "Oyoqda yaralar bo'lsa, qattiq bosim qilmang.",
                safetyTipRu: "Не оказывайте сильного давления при наличии ранок на стопах.",
                safetyTipEn: "Avoid heavy pressure if foot ulcers or sores exist.",
                intensityEn: "Light",
                intensityRu: "Лёгкая"
            },
            {
                id: 'ex-diabet-3',
                title: "Yengil tanaffus kardiomashqi",
                titleRu: "Легкое кардио без отягощений",
                titleEn: "Light bodyweight cardio",
                duration: 25,
                calories: 130,
                intensity: "O'rtacha",
                icon: "fitness-outline",
                color: "#FFA726",
                descUz: "Qon aylanishini tezlashtiruvchi qo'l-oyoq silkitish, yarim o'tirib-turish va erkin nafas olish harakatlari.",
                descRu: "Аэробные движения для улучшения чувствительности тканей к инсулину.",
                descEn: "Arm and leg swings, gentle half-squats, and rhythmic breathing to stimulate systemic circulation.",
                safetyTipUz: "Shakar 250 mg/dL dan baland bo'lsa kardio qilmang.",
                safetyTipRu: "Не занимайтесь кардио, если сахар крови выше 250 мг/дл.",
                safetyTipEn: "Do not do cardio if blood glucose exceeds 250 mg/dL.",
                intensityEn: "Moderate",
                intensityRu: "Средняя"
            },
            {
                id: 'ex-diabet-4',
                title: "Stulga o'tirib-turish (Insulin sezuvchanligini oshirish)",
                titleRu: "Приседания к стулу (повышение чувствительности к инсулину)",
                titleEn: "Chair squats for insulin uptake",
                duration: 15,
                calories: 75,
                intensity: "O'rtacha",
                icon: "body-outline",
                color: "#26C6DA",
                descUz: "Son va dumba yirik mushaklarini faollashtirish glyukozaning hujayralarga o'tishini tezlashtiradi.",
                descRu: "Крупные мышцы бедер захватывают глюкозу из крови без участия избыточного инсулина.",
                descEn: "Activating large thigh and glute muscles facilitates glucose uptake directly into cells.",
                safetyTipUz: "Orqangizda barqaror stul bo'lsin, tizzalarni qattiq bukmang.",
                safetyTipRu: "Используйте устойчивый стул за спиной, не сгибайте колени слишком сильно.",
                safetyTipEn: "Use a sturdy chair behind you; do not overflex knees.",
                intensityEn: "Moderate",
                intensityRu: "Средняя"
            },
            {
                id: 'ex-diabet-5',
                title: "Yengil rezina tasma bilan tonus mashqi",
                titleRu: "Упражнения с резиновой лентой для мышц рук и спины",
                titleEn: "Upper body resistance band toning",
                duration: 20,
                calories: 90,
                intensity: "O'rtacha",
                icon: "barbell-outline",
                color: "#AB47BC",
                descUz: "Qon tomir devorlari egiluvchanligini saqlash va mushak massasini quvvatlash.",
                descRu: "Укрепляет мышечную ткань, защищая от возрастной потери мышечной массы при диабете.",
                descEn: "Preserving vascular wall elasticity and supporting lean muscle mass.",
                safetyTipUz: "Nafasni to'xtatmang, muntazam nafas oling.",
                safetyTipRu: "Не задерживайте дыхание, дышите ровно и спокойно.",
                safetyTipEn: "Do not hold your breath; breathe continuously and steadily.",
                intensityEn: "Moderate",
                intensityRu: "Средняя"
            },
            {
                id: 'ex-diabet-6',
                title: "Kechki tinchlantiruvchi yoga va yengil cho'zilish",
                titleRu: "Вечерняя успокаивающая йога и растяжка",
                titleEn: "Restorative evening yoga & relaxation",
                duration: 15,
                calories: 40,
                intensity: "Juda yengil",
                icon: "leaf-outline",
                color: "#66BB6A",
                descUz: "Kortizol (stress gormoni) darajasini pasaytirish orqali tungi glyukoza ko'tarilishining oldini oladi.",
                descRu: "Снижает вечерний кортизол, предотвращая ночные скачки сахара в крови.",
                descEn: "Reduces evening cortisol levels to prevent nocturnal blood sugar spikes.",
                safetyTipUz: "Keskin harakatlar qilmang, chuqur va erkin nafas oling.",
                safetyTipRu: "Избегайте резких движений, дышите глубоко и свободно.",
                safetyTipEn: "Avoid abrupt jerky movements; breathe deeply and freely.",
                intensityEn: "Very Light",
                intensityRu: "Очень лёгкая"
            }
        ],
        aiContext: {
            focusArea: "qon shakar miqdori, uglevod hisobi, insulin va gipoglikemiyaning oldini olish",
            specialRules: "Bemorga shakar pastligi (gipoglikemiya) va tovon parvarishi haqida eslatib tur."
        }
    },

    'Gipertenziya': {
        key: 'gipertenziya',
        title: 'Gipertenziya',
        titleRu: 'Гипертония',
        titleEn: 'Hypertension',
        icon: 'heart-outline',
        color: '#E91E63',
        chartTitle: "Sistolik qon bosimi (mmHg)",
        chartTitleRu: "Систолическое давление (мм рт.ст.)",
        chartTitleEn: "Systolic Blood Pressure (mmHg)",
        metrics: [
            { key: 'systolic', label: 'Sistolik', labelEn: 'Systolic BP', labelRu: 'Систолическое', unit: 'mmHg', icon: 'heart-outline', color: '#E91E63', defaultVal: '' },
            { key: 'diastolic', label: 'Diastolik', labelEn: 'Diastolic BP', labelRu: 'Диастолическое', unit: 'mmHg', icon: 'heart-half-outline', color: '#F48FB1', defaultVal: '' },
            { key: 'heartRate', label: 'Yurak urishi', labelEn: 'Heart Rate', labelRu: 'Пульс', unit: 'bpm', icon: 'pulse-outline', color: '#FF9800', defaultVal: '' }
        ],
        limits: {
            systolic: { low: 90, normalMin: 100, normalMax: 130, high: 140, critical: 180 },
            diastolic: { low: 60, normalMin: 60, normalMax: 85, high: 90, critical: 110 }
        },
        diet: {
            name: "DASH parhezi (Kam tuzli)",
            nameRu: "Диета DASH (Низкосолевая)",
            nameEn: "DASH Low-Sodium Diet",
            tags: ['gipertenziya', 'kam_tuz', 'yurak_uchun', 'kaliy_boy'],
            allowedFoods: ["Tuzsiz qaynatilgan go'sht", "Sabzavotlar (lavlagi, qovoq)", "Kaliyga boy banan, quritilgan o'rik", "Baliq va dengiz mahsulotlari", "Zaytun moyi"],
            restrictedFoods: ["Osh tuzi (kuniga 3-4g dan kam)", "Tuzlangan bodring va konservalar", "Qazi va dudlangan kolbasalar", "Energetik va kuchli kofe"],
            allowedFoodsRu: ["Отварное нежирное мясо", "Овощи (свекла, тыква)", "Богатые калием бананы и курага", "Рыба и морепродукты", "Оливковое масло"],
            allowedFoodsEn: ["Lean boiled meat", "Vegetables (beets, pumpkin)", "Potassium-rich bananas & dried apricots", "Fish & seafood", "Olive oil"],
            restrictedFoodsRu: ["Поваренная соль (до 3-4 г в день)", "Соленые огурцы и консервы", "Копчености и колбасы", "Энергетики и крепкий кофе"],
            restrictedFoodsEn: ["Table salt (<3-4g per day)", "Pickles & canned preserves", "Smoked sausages", "Energy drinks & strong coffee"],
            tipUz: "Kunlik tuz miqdorini yarim choy qoshig'idan oshirmang. Ko'proq suv iching.",
            tipRu: "Ограничьте соль до 3-5 г в день. Исключите соленья и копчености.",
            tipEn: "Keep daily sodium intake below half a teaspoon. Stay well hydrated."
        },
        medications: {
            diseaseKey: 'gipertenziya',
            quickMeds: [
                { name: 'Enalapril', dose: '10 mg', time: 'ertalab', meal: 'farqi_yoq', color: '#E91E63' },
                { name: 'Amlodipin', dose: '5 mg', time: 'ertalab', meal: 'farqi_yoq', color: '#4A9EFF' },
                { name: 'Losartan', dose: '50 mg', time: 'ertalab', meal: 'farqi_yoq', color: '#9C27B0' },
                { name: 'Bisoprolol', dose: '5 mg', time: 'ertalab', meal: 'ovqatdan_oldin', color: '#00E676' },
                { name: 'Indapamid', dose: '1.5 mg', time: 'ertalab', meal: 'ovqatdan_oldin', color: '#FFA726' }
            ]
        },
        exercises: [
            {
                id: 'ex-giper-1',
                title: "Diafragmal nafas mashqi (Bosim tushirish)",
                titleRu: "Дыхательная гимнастика для снижения давления",
                titleEn: "Deep diaphragmatic breathing",
                duration: 10,
                calories: 30,
                intensity: "Juda yengil",
                icon: "leaf-outline",
                color: "#00E676",
                descUz: "Burun orqali 4 soniya chuqur nafas oling, 4 soniya ushlab turing va labni qisib 6 soniya chiqaring. Asabni tinchlantiradi va bosimni 5-10 mm ga pasaytiradi.",
                descRu: "Медленное глубокое дыхание активирует парасимпатическую систему и снижает давление.",
                descEn: "Inhale 4s through nose, hold 4s, exhale 6s through pursed lips. Calms nervous system and lowers BP by 5-10 mmHg.",
                safetyTipUz: "Bosh aylansa mashqni to'xtating va o'tiring.",
                safetyTipRu: "При головокружении немедленно прекратите и сядьте.",
                safetyTipEn: "If dizzy, immediately stop and sit down.",
                intensityEn: "Very Light",
                intensityRu: "Очень лёгкая"
            },
            {
                id: 'ex-giper-2',
                title: "Sokin aerobik yurish",
                titleRu: "Аэробная прогулка в среднем темпе",
                titleEn: "Brisk aerobic walking",
                duration: 30,
                calories: 140,
                intensity: "O'rtacha",
                icon: "walk-outline",
                color: "#E91E63",
                descUz: "Tekis joyda erkin ritm bilan qadam tashlash. Tomirlar egiluvchanligini oshiradi.",
                descRu: "Ходьба улучшает эластичность сосудов и стабилизирует давление.",
                descEn: "Rhythmic flat-surface walking improves arterial elasticity and stabilizes blood pressure.",
                safetyTipUz: "Og'ir yuk yoki ryukzak ko'tarmang.",
                safetyTipRu: "Не носите тяжелые рюкзаки или утяжелители.",
                safetyTipEn: "Do not carry heavy backpacks or hand weights.",
                intensityEn: "Moderate",
                intensityRu: "Средняя"
            },
            {
                id: 'ex-giper-3',
                title: "Yelka va bo'yin muskullarini bo'shashtirish",
                titleRu: "Расслабление шеи и плечевого пояса",
                titleEn: "Neck and shoulder relaxation",
                duration: 15,
                calories: 45,
                intensity: "Yengil",
                icon: "refresh-outline",
                color: "#4A9EFF",
                descUz: "Miya qon aylanishini normallashtirish va spazmlarni yo'qotish uchun yengil aylana harakatlar.",
                descRu: "Снимает спазм сосудов шеи и улучшает венозный отток от головы.",
                descEn: "Gentle circular movements to normalize cerebral blood circulation and relieve vascular spasms.",
                safetyTipUz: "Keskin burilishlar qilmang.",
                safetyTipRu: "Избегайте резких поворотов и наклонов шеи.",
                safetyTipEn: "Avoid sharp twists or sudden neck bends.",
                intensityEn: "Light",
                intensityRu: "Лёгкая"
            },
            {
                id: 'ex-giper-4',
                title: "Izometrik kaft mashqi (Qon bosimini tushirish)",
                titleRu: "Изометрическое сжатие кистей (снижение АД)",
                titleEn: "Isometric handgrip workout",
                duration: 12,
                calories: 35,
                intensity: "Yengil",
                icon: "fitness-outline",
                color: "#FF9800",
                descUz: "Kauchuk koptokcha yoki espanerni 2 daqiqa o'rtacha kuch bilan qisib turish qon tomirlar reaktivligini yaxshilaydi.",
                descRu: "Клинически доказанный метод мягкого снижения систолического давления.",
                descEn: "Squeezing a stress ball or isometric handgrip for 2 min improves vascular compliance.",
                safetyTipUz: "Maksimal kuch bilan siqmang, nafasni ushlamang.",
                safetyTipRu: "Не сжимайте с максимальной силой, не задерживайте дыхание.",
                safetyTipEn: "Do not squeeze with maximal force; do not hold breath.",
                intensityEn: "Light",
                intensityRu: "Лёгкая"
            },
            {
                id: 'ex-giper-5',
                title: "Oyoq va son orqa mushaklarini cho'zish",
                titleRu: "Плавная растяжка задней поверхности бедра",
                titleEn: "Hamstring and calf gentle stretch",
                duration: 15,
                calories: 40,
                intensity: "Yengil",
                icon: "body-outline",
                color: "#9C27B0",
                descUz: "Periferik tomirlar qarshiligini kamaytiruvchi, yurakka qaytuvchi qon oqimini yengillashtiruvchi cho'zilishlar.",
                descRu: "Улучшает венозный возврат и снижает общее периферическое сопротивление сосудов.",
                descEn: "Smooth stretching reduces peripheral vascular resistance and eases venous return to heart.",
                safetyTipUz: "Boshni tizzadan pastga keskin egmang.",
                safetyTipRu: "Не опускайте голову резко ниже колен.",
                safetyTipEn: "Never lower head below knees abruptly.",
                intensityEn: "Light",
                intensityRu: "Лёгкая"
            }
        ],
        aiContext: {
            focusArea: "qon bosimi (sistolik/diastolik), tuz iste'moli, kardiologik ehtiyot choralari",
            specialRules: "Og'ir shtanga yoki nafasni ushlab zo'riqish mashqlarini mutlaqo taqiqlang. Tuzni cheklashni eslat."
        }
    },

    'Aritmiya': {
        key: 'aritmiya',
        title: 'Aritmiya',
        titleRu: 'Аритмия',
        titleEn: 'Arrhythmia',
        icon: 'pulse-outline',
        color: '#FF5722',
        chartTitle: "Yurak urishi (bpm)",
        chartTitleRu: "Пульс (уд/мин)",
        chartTitleEn: "Heart Rate (bpm)",
        metrics: [
            { key: 'heartRate', label: 'Yurak urishi', labelEn: 'Heart Rate', labelRu: 'Пульс', unit: 'bpm', icon: 'pulse-outline', color: '#FF5722', defaultVal: '' }
        ],
        limits: {
            heartRate: { low: 55, normalMin: 60, normalMax: 90, high: 100, critical: 130 }
        },
        diet: {
            name: "Yurak ritmini qo'llab-quvvatlovchi parhez",
            nameRu: "Диета для поддержки сердечного ритма",
            nameEn: "Heart Rhythm Support Diet",
            tags: ['aritmiya', 'magniy_boy', 'kaliy_boy'],
            allowedFoods: ["Yashil sabzavotlar (magniy manbai)", "Dengiz balig'i (Omega-3)", "Quritilgan mevalar", "Yong'oq va bodom"],
            restrictedFoods: ["Qahva va kofeinli ichimliklar", "Spirtli ichimliklar", "Energetiklar", "Juda issiq yoki sho'r ovqatlar"],
            allowedFoodsRu: ["Зеленые овощи (источник магния)", "Морская рыба (Омега-3)", "Сухофрукты", "Грецкие орехи и миндаль"],
            allowedFoodsEn: ["Leafy greens (magnesium source)", "Fatty fish (Omega-3)", "Dried fruits", "Walnuts and almonds"],
            restrictedFoodsRu: ["Кофе и кофеиносодержащие напитки", "Алкогольные напитки", "Энергетики", "Слишком горячая или соленая пища"],
            restrictedFoodsEn: ["Coffee & caffeinated drinks", "Alcoholic beverages", "Energy drinks", "Very hot or salty foods"],
            tipUz: "Kofein va energetik ichimliklarni qat'iyan cheklang. Magniyga boy ovqatlarni tanlang.",
            tipRu: "Исключите кофеин, энергетики и алкоголь — они провоцируют срывы ритма.",
            tipEn: "Strictly avoid caffeine and energy drinks. Choose foods rich in magnesium and potassium."
        },
        medications: {
            diseaseKey: 'aritmiya',
            quickMeds: [
                { name: 'Bisoprolol', dose: '2.5 mg', time: 'ertalab', meal: 'ovqatdan_oldin', color: '#FF5722' },
                { name: 'Metoprolol', dose: '50 mg', time: 'ertalab_kechqurun', meal: 'ovqat_paytida', color: '#4A9EFF' },
                { name: 'Amiodaron', dose: '200 mg', time: 'ertalab', meal: 'ovqatdan_keyin', color: '#9C27B0' },
                { name: 'Panangin (Kaliy+Magniy)', dose: '1 tab', time: 'ertalab_kechqurun', meal: 'ovqatdan_keyin', color: '#00E676' }
            ]
        },
        exercises: [
            {
                id: 'ex-arit-1',
                title: "Ritmni tinchlantiruvchi yoga va cho'zilish",
                titleRu: "Успокаивающая растяжка и йога",
                titleEn: "Calming stretch and restorative yoga",
                duration: 20,
                calories: 60,
                intensity: "Yengil",
                icon: "leaf-outline",
                color: "#00E676",
                descUz: "Sokin cho'zilish va tinch nafas olish yurak urish tezligini mo'tadillashtiradi.",
                descRu: "Плавные растяжки снимают психоэмоциональное напряжение.",
                descEn: "Gentle stretching and calm breathing stabilize cardiac rate and ease stress.",
                safetyTipUz: "Puls 100 dan oshsa, darhol o'tirib dam oling.",
                safetyTipRu: "Если пульс превысит 100 уд/мин, немедленно сядьте и отдохните.",
                safetyTipEn: "If pulse exceeds 100 bpm, sit down immediately and rest.",
                intensityEn: "Light",
                intensityRu: "Лёгкая"
            },
            {
                id: 'ex-arit-2',
                title: "Toza havoda o'rtacha sur'atda sayr",
                titleRu: "Прогулка на свежем воздухе",
                titleEn: "Outdoor paced walk",
                duration: 25,
                calories: 100,
                intensity: "Yengil",
                icon: "walk-outline",
                color: "#4A9EFF",
                descUz: "Yurak mushagini ortiqcha zo'riqtirmasdan kislorod bilan to'yintirish.",
                descRu: "Насыщает миокард кислородом без пиковых нагрузок.",
                descEn: "Oxygenates cardiac tissue without causing excessive heart rate spikes.",
                safetyTipUz: "Qattiq sovuq yoki jaziramada mashq qilmang.",
                safetyTipRu: "Не тренируйтесь на сильном морозе или в жару.",
                safetyTipEn: "Avoid exercising in severe cold or extreme heat.",
                intensityEn: "Light",
                intensityRu: "Лёгкая"
            },
            {
                id: 'ex-arit-3',
                title: "Kresloda o'tirgan holda bo'g'im gimnastikasi",
                titleRu: "Гимнастика для суставов сидя на стуле",
                titleEn: "Seated mobility & circulation",
                duration: 15,
                calories: 45,
                intensity: "Juda yengil",
                icon: "body-outline",
                color: "#26C6DA",
                descUz: "Yurak qon haydash hajmini silliq oshiruvchi o'tirgan holatdagi aylana harakatlar.",
                descRu: "Безопасная суставная разминка без учащения сердечного ритма.",
                descEn: "Gentle seated circular mobility smoothly promotes cardiac output without tachycardia.",
                safetyTipUz: "Har 5 daqiqada pulsni o'lchang.",
                safetyTipRu: "Измеряйте пульс каждые 5 минут.",
                safetyTipEn: "Check your pulse every 5 minutes.",
                intensityEn: "Very Light",
                intensityRu: "Очень лёгкая"
            },
            {
                id: 'ex-arit-4',
                title: "Progressiv mushak relaksatsiyasi (Jakobson metodi)",
                titleRu: "Прогрессивная релаксация по Джекобсону",
                titleEn: "Progressive muscle relaxation",
                duration: 20,
                calories: 35,
                intensity: "Juda yengil",
                icon: "leaf-outline",
                color: "#AB47BC",
                descUz: "Mushaklarni navbatma-navbat bo'shashtirish orqali ekstrasistoliya va yurak uvishishini kamaytiradi.",
                descRu: "Снижает выброс адреналина и стабилизирует частоту сердечных сокращений.",
                descEn: "Alternating muscle contraction and relaxation reduces stress-induced extrasystoles.",
                safetyTipUz: "Tinch va qorong'iroq xonada bajaring.",
                safetyTipRu: "Выполняйте в тихой и затемненной комнате.",
                safetyTipEn: "Perform in a quiet and dim environment.",
                intensityEn: "Very Light",
                intensityRu: "Очень лёгкая"
            },
            {
                id: 'ex-arit-5',
                title: "To'shakda yengil velosiped harakati",
                titleRu: "Легкий «велосипед» лежа на спине",
                titleEn: "Supine gentle cycling",
                duration: 12,
                calories: 50,
                intensity: "Yengil",
                icon: "fitness-outline",
                color: "#FFA726",
                descUz: "Oyoqlardan qon oqimini yurakka qaytarishni yaxshilaydi, yurak mushagini zo'riqtirmaydi.",
                descRu: "Улучшает венозный отток из нижних конечностей без нагрузки на миокард.",
                descEn: "Facilitates venous return from lower extremities without cardiac strain.",
                safetyTipUz: "Tez emas, juda sekin sur'atda bajaring.",
                safetyTipRu: "Выполняйте плавно и медленно, без спешки.",
                safetyTipEn: "Move slowly and gently, not fast.",
                intensityEn: "Light",
                intensityRu: "Лёгкая"
            }
        ],
        aiContext: {
            focusArea: "yurak urish ritmi, puls nazorati, stressni boshqarish",
            specialRules: "Har qanday kuchli jismoniy zo'riqish taqiqlanadi. Puls keskin o'zgarganda shifokorga yo'naltir."
        }
    },

    'Semizlik': {
        key: 'semizlik',
        title: 'Semizlik',
        titleRu: 'Ожирение / Лишний вес',
        titleEn: 'Obesity / Weight Control',
        icon: 'barbell-outline',
        color: '#9C27B0',
        chartTitle: "Vazn dinamikasi (kg)",
        chartTitleRu: "Динамика веса (кг)",
        chartTitleEn: "Weight Dynamics (kg)",
        metrics: [
            { key: 'weight', label: 'Vazn', labelEn: 'Weight', labelRu: 'Вес', unit: 'kg', icon: 'barbell-outline', color: '#9C27B0', defaultVal: '' },
            { key: 'calories', label: 'Kaloriya', labelEn: 'Calories', labelRu: 'Калории', unit: 'kcal', icon: 'flame-outline', color: '#FF9800', defaultVal: '' }
        ],
        limits: {
            calories: { low: 1200, normalMin: 1400, normalMax: 2000, high: 2300, critical: 3000 }
        },
        diet: {
            name: "Gipokalorik muvozanatli parhez",
            nameRu: "Гипокалорийная сбалансированная диета",
            nameEn: "Hypocaloric Balanced Diet",
            tags: ['semizlik', 'kam_kaloriya', 'kletchatka_boy'],
            allowedFoods: ["Tola (kletchatka)ga boy xom sabzavotlar", "Oq go'sht va tuxum oqi", "Grechka va jigarrang guruch", "Kefir va yog'siz tvorog", "Kamida 2 litr toza suv"],
            restrictedFoods: ["Fasfood va qovurilgan taomlar", "Shirin gazaklar va shokolad", "Mayonez va souslar", "Yog'li qo'y go'shti va qovurilgan somsa"],
            allowedFoodsRu: ["Свежие овощи, богатые клетчаткой", "Белое мясо и яичные белки", "Гречка и бурый рис", "Кефир и обезжиренный творог", "Не менее 2 литров чистой воды"],
            allowedFoodsEn: ["Fiber-rich raw vegetables", "White poultry & egg whites", "Buckwheat & brown rice", "Kefir & low-fat cottage cheese", "At least 2 liters of water"],
            restrictedFoodsRu: ["Фастфуд и жареная пища", "Сладкие снеки и шоколад", "Майонез и соусы", "Жирная баранина и жареная выпечка"],
            restrictedFoodsEn: ["Fast food & fried meals", "Sugary snacks & chocolate", "Mayonnaise & dressings", "Fatty red meat & pastries"],
            tipUz: "Kichik likopchalardan foydalaning. Taomni sekin va yaxshilab chaynang.",
            tipRu: "Создайте умеренный дефицит калорий (300-500 ккал). Пейте воду перед едой.",
            tipEn: "Use smaller plates. Chew food slowly and drink water 20 minutes before meals."
        },
        medications: {
            diseaseKey: 'semizlik',
            quickMeds: [
                { name: 'Semaglutid (Wegovy)', dose: '0.5 mg/hafta', time: 'haftada_1_kun', meal: 'farqi_yoq', color: '#00C853' },
                { name: 'Liraglutid (Saxenda)', dose: '1.8 mg', time: 'ertalab', meal: 'farqi_yoq', color: '#00B0FF' },
                { name: 'Tirzepatid (Mounjaro)', dose: '5 mg/hafta', time: 'haftada_1_kun', meal: 'farqi_yoq', color: '#FF6D00' },
                { name: 'Orlistat (Xenical)', dose: '120 mg', time: 'tushlik_kechqurun', meal: 'ovqat_paytida', color: '#9C27B0' },
                { name: 'Sibutramin (Reduxin)', dose: '10 mg', time: 'ertalab', meal: 'ovqatdan_oldin', color: '#AA00FF' },
                { name: 'Metformin (Glucophage)', dose: '850 mg', time: 'kechqurun', meal: 'ovqatdan_keyin', color: '#4A9EFF' }
            ]
        },
        exercises: [
            {
                id: 'ex-semiz-1',
                title: "Bo'g'imlarga xavfsiz past zarbali kardio (Low-impact)",
                titleRu: "Низкоударное кардио без нагрузки на суставы",
                titleEn: "Joint-safe low-impact cardio",
                duration: 35,
                calories: 160,
                intensity: "O'rtacha",
                icon: "bicycle-outline",
                color: "#9C27B0",
                descUz: "Tizzalarga zarba bermaydigan velotrenajyor yoki tekis yerda sokin ritmli yurish. Bo'g'imlarni asragan holda yog'larni samarali parchalaydi.",
                descRu: "Ходьба или велотренажер без ударной нагрузки на коленные суставы. Эффективно сжигает жир.",
                descEn: "Non-impact stationary bike or brisk flat walking protects knees while burning fat effectively.",
                safetyTipUz: "Sakrash va qattiq yugurish taqiqlanadi (tizza bo'g'imlarini asrang).",
                safetyTipRu: "Прыжки и бег с ударной нагрузкой запрещены (берегите суставы).",
                safetyTipEn: "Jumping and hard running are strictly prohibited (protect knee joints).",
                intensityEn: "Moderate",
                intensityRu: "Средняя"
            },
            {
                id: 'ex-semiz-2',
                title: "Skandinavcha yurish (Tayoqchalar bilan)",
                titleRu: "Скандинавская ходьба с палками",
                titleEn: "Nordic walking with poles",
                duration: 40,
                calories: 220,
                intensity: "O'rtacha",
                icon: "walk-outline",
                color: "#00E676",
                descUz: "Tayoqchalar tana vaznining 30% ini o'ziga olib tizza va umurtqani himoya qiladi, tana mushaklarining 90% ini ishlatadi.",
                descRu: "Снимает до 30% нагрузки с суставов и позвоночника, задействуя 90% мышц тела.",
                descEn: "Walking poles absorb up to 30% of bodyweight, protecting knees and engaging 90% of muscles.",
                safetyTipUz: "Tayoqcha balandligini bo'yingizga moslang (tirsak 90 daraja).",
                safetyTipRu: "Отрегулируйте высоту палок (локоть 90 градусов).",
                safetyTipEn: "Adjust pole height to your height (elbow at 90 degrees).",
                intensityEn: "Moderate",
                intensityRu: "Средняя"
            },
            {
                id: 'ex-semiz-3',
                title: "Kreslo kardiomashqi (O'tirgan holda bo'g'im gimnastikasi)",
                titleRu: "Кардио на стуле (щадящая гимнастика сидя)",
                titleEn: "Chair cardio & seated mobility",
                duration: 20,
                calories: 85,
                intensity: "Yengil",
                icon: "body-outline",
                color: "#4A9EFF",
                descUz: "Tizzasida og'riq bor yoki og'ir vaznli bemorlar uchun stulda o'tirgan holda qo'l-oyoq silkitish, nafas mashqi va gavdani aylantirish.",
                descRu: "Безопасные движения руками и ногами сидя на стуле для людей с выраженным лишним весом.",
                descEn: "Gentle seated arm and leg movements and trunk rotations for patients with joint discomfort.",
                safetyTipUz: "Tik turishdan og'riq sezilsa barcha harakatlarni faqat o'tirib bajaring.",
                safetyTipRu: "При болях стоя выполняйте все упражнения только сидя.",
                safetyTipEn: "If standing causes joint pain, perform all movements seated.",
                intensityEn: "Light",
                intensityRu: "Лёгкая"
            },
            {
                id: 'ex-semiz-4',
                title: "Suzish yoki suvda akvaaerobika",
                titleRu: "Плавание и аквааэробика в бассейне",
                titleEn: "Swimming / water aerobics",
                duration: 45,
                calories: 260,
                intensity: "Faol",
                icon: "water-outline",
                color: "#00B0FF",
                descUz: "Suvda tana vaznsizlashadi: bo'g'imlarga mutlaqo nol bosim tushadi va bir vaqtning o'zida maksimal kaloriya yoqiladi.",
                descRu: "В воде суставы разгружаются, обеспечивая безопасное и мощное сжигание калорий.",
                descEn: "Water provides buoyancy, resulting in zero joint impact while maximizing calorie expenditure.",
                safetyTipUz: "Hovuzdan so'ng darhol issiq dush oling va sochiq bilan yaxshilab artining.",
                safetyTipRu: "Примите теплый душ и насухо вытритесь после бассейна.",
                safetyTipEn: "Take a warm shower and dry off thoroughly after the pool.",
                intensityEn: "Active",
                intensityRu: "Активная"
            },
            {
                id: 'ex-semiz-5',
                title: "Qorin va bel mushaklarini kuchaytirish (Core tonus)",
                titleRu: "Укрепление мышц кора и пресса на коврике",
                titleEn: "Gentle core & abdominal strengthening",
                duration: 20,
                calories: 95,
                intensity: "Yengil",
                icon: "fitness-outline",
                color: "#FF9800",
                descUz: "Yotgan holda tizzalarni qoringa tortish, ko'prik (yarim chanoq ko'tarish) va umurtqa pog'onasi mushaklarini baquvvat qilish.",
                descRu: "Укрепляет мышечный корсет, защищающий поясницу при лишней массе тела.",
                descEn: "Supine knee-to-chest pulls, glute bridges, and gentle spinal stabilization.",
                safetyTipUz: "Beldan og'riq sezilsa harakat amplitudasini kamaytiring.",
                safetyTipRu: "При боли в пояснице уменьшите амплитуду движений.",
                safetyTipEn: "If lower back pain occurs, reduce range of motion.",
                intensityEn: "Light",
                intensityRu: "Лёгкая"
            },
            {
                id: 'ex-semiz-6',
                title: "Rezina tasma (espaner) bilan tonus mashqi",
                titleRu: "Тонизирующие упражнения с резиновой лентой",
                titleEn: "Resistance band toning routine",
                duration: 25,
                calories: 120,
                intensity: "O'rtacha",
                icon: "barbell-outline",
                color: "#E91E63",
                descUz: "Bo'g'imlarni jarohatlamasdan yelka, orqa va ko'krak mushaklarini tonusga keltirish orqali bazal metabolizmni oshirish.",
                descRu: "Формирует мышечный тонус без опасных свободных весов, ускоряя базовый обмен веществ.",
                descEn: "Toning shoulders, back, and chest with elastic resistance bands to boost basal metabolic rate without heavy weights.",
                safetyTipUz: "Zo'riqish paytida nafasni ushlab qolmang, muntazam nafas oling.",
                safetyTipRu: "Не задерживайте дыхание при напряжении, дышите равномерно.",
                safetyTipEn: "Do not hold your breath during exertion; breathe rhythmically.",
                intensityEn: "Moderate",
                intensityRu: "Средняя"
            }
        ],
        aiContext: {
            focusArea: "kaloriya balansi, tana massasi indeksi (BMI), sog'lom ozish",
            specialRules: "Qattiq och qolish parhezlarini taqiqlang. Haftasiga 0.5-1 kg xavfsiz ozish me'yorini tushuntir."
        }
    },

    'Astma': {
        key: 'astma',
        title: 'Astma',
        titleRu: 'Бронхиальная астма',
        titleEn: 'Asthma',
        icon: 'leaf-outline',
        color: '#4CAF50',
        chartTitle: "Kislorod (SpO2 %)",
        chartTitleRu: "Кислород в крови (SpO2 %)",
        chartTitleEn: "Blood Oxygen (SpO2 %)",
        metrics: [
            { key: 'spO2', label: 'Kislorod (SpO2)', labelEn: 'Oxygen (SpO2)', labelRu: 'Кислород (SpO2)', unit: '%', icon: 'cloud-outline', color: '#4CAF50', defaultVal: '' },
            { key: 'peakFlow', label: 'Nafas (Peak Flow)', labelEn: 'Peak Flow', labelRu: 'Пикфлоуметрия', unit: 'L/min', icon: 'leaf-outline', color: '#8BC34A', defaultVal: '' }
        ],
        limits: {
            spO2: { low: 90, normalMin: 95, normalMax: 100, high: 100, critical: 88 }
        },
        diet: {
            name: "Gipoallergen antiallergik parhez",
            nameRu: "Гипоаллергенная диета при астме",
            nameEn: "Hypoallergenic Asthma Diet",
            tags: ['astma', 'gipoallergen', 'antioksidant'],
            allowedFoods: ["Olma va nok", "Qovoq va sabzavotli sho'rvalar", "Kurka va quyon go'shti", "Guruch va suli"],
            restrictedFoods: ["Sitrus mevalar va qulupnay", "Asal va yong'oqlar (allergiya xavfi)", "Konservantlar va sun'iy bo'yoqlar", "Dudlangan baliq va pishloqlar"],
            allowedFoodsRu: ["Яблоки и груши", "Тыква и овощные супы", "Мясо индейки и кролика", "Рис и овсянка"],
            allowedFoodsEn: ["Apples and pears", "Pumpkin & vegetable broths", "Turkey & rabbit meat", "Rice and oatmeal"],
            restrictedFoodsRu: ["Цитрусовые и клубника", "Мед и орехи (риск аллергии)", "Консерванты и красители", "Копченая рыба и сыры"],
            restrictedFoodsEn: ["Citrus fruits & strawberries", "Honey & nuts (allergy risk)", "Artificial preservatives & colors", "Smoked fish & aged cheeses"],
            tipUz: "Allergiya chaqirishi mumkin bo'lgan oziq-ovqatlardan saqlaning.",
            tipRu: "Избегайте сульфитов, консервантов и продуктов-аллергенов.",
            tipEn: "Avoid foods with sulfur additives and known individual allergic triggers."
        },
        medications: {
            diseaseKey: 'astma',
            quickMeds: [
                { name: 'Salbutamol (Inxalyator)', dose: '100 mkg', time: 'ehtiyojga_qarab', meal: 'farqi_yoq', color: '#4CAF50' },
                { name: 'Beklometazon', dose: '250 mkg', time: 'ertalab_kechqurun', meal: 'farqi_yoq', color: '#4A9EFF' },
                { name: 'Montelukast', dose: '10 mg', time: 'kechqurun', meal: 'farqi_yoq', color: '#9C27B0' },
                { name: 'Budasonid', dose: '200 mkg', time: 'ertalab', meal: 'farqi_yoq', color: '#FFA726' }
            ]
        },
        exercises: [
            {
                id: 'ex-astma-1',
                title: "Buteyko usuli bo'yicha nafas gimnastikasi",
                titleRu: "Дыхательная гимнастика по Бутейко",
                titleEn: "Buteyko breathing method",
                duration: 15,
                calories: 35,
                intensity: "Yengil",
                icon: "leaf-outline",
                color: "#4CAF50",
                descUz: "Kichik va sayoz nafas olish texnikasi orqali bronxlar spazmini kamaytirish va o'pka hajmini oshirish.",
                descRu: "Учит контролировать приступы удушья и восстанавливать носовое дыхание.",
                descEn: "Shallow breathing control technique to relieve bronchial spasms and improve vital lung capacity.",
                safetyTipUz: "Yonida shoshilinch inxalyator (Salbutamol) bo'lishi shart.",
                safetyTipRu: "Всегда держите при себе ингалятор скорой помощи (Сальбутамол).",
                safetyTipEn: "Always keep a quick-relief rescue inhaler (Salbutamol) at hand.",
                intensityEn: "Light",
                intensityRu: "Лёгкая"
            },
            {
                id: 'ex-astma-2',
                title: "Issiq xonada yengil gimnastika",
                titleRu: "Легкая суставная разминка в тепле",
                titleEn: "Warm indoor gentle mobility",
                duration: 20,
                calories: 70,
                intensity: "Yengil",
                icon: "body-outline",
                color: "#8BC34A",
                descUz: "Iliq va nam havoda qo'l-oyoqlarni cho'zish, ko'krak qafasini kengaytirish mashqlari.",
                descRu: "Раскрывает грудную клетку и улучшает вентиляцию нижних отделов легких.",
                descEn: "Gentle indoor mobility in warm, humid air to expand chest and ventilate lower lungs.",
                safetyTipUz: "Chang, gulchangi yoki sovuq havoda mashq qilmang.",
                safetyTipRu: "Не занимайтесь в пыли, при пыльце или на холодном воздухе.",
                safetyTipEn: "Never exercise in dusty, pollen-heavy, or cold environments.",
                intensityEn: "Light",
                intensityRu: "Лёгкая"
            },
            {
                id: 'ex-astma-3',
                title: "Lablarni naycha qilib nafas chiqarish (Pursed-lip)",
                titleRu: "Дыхание сквозь сжатые губы",
                titleEn: "Pursed-lip breathing technique",
                duration: 12,
                calories: 25,
                intensity: "Juda yengil",
                icon: "leaf-outline",
                color: "#26A69A",
                descUz: "Bronxial yo'llarda ijobiy bosim hosil qilib, mayda alveolalar yopilib qolishining oldini oladi.",
                descRu: "Создает положительное давление в дыхательных путях, предотвращая спадение альвеол.",
                descEn: "Creates positive airway pressure preventing small alveoli from collapsing.",
                safetyTipUz: "Nafas chiqarish nafas olishdan 2 baravar uzun bo'lishi kerak.",
                safetyTipRu: "Выдох должен быть в 2 раза длиннее вдоха.",
                safetyTipEn: "Exhalation duration must be twice as long as inhalation.",
                intensityEn: "Very Light",
                intensityRu: "Очень лёгкая"
            },
            {
                id: 'ex-astma-4',
                title: "Ko'krak qafasini kengaytiruvchi yoga pozalari",
                titleRu: "Позы йоги для раскрытия грудной клетки",
                titleEn: "Chest-opening gentle yoga",
                duration: 18,
                calories: 55,
                intensity: "Yengil",
                icon: "fitness-outline",
                color: "#00BCD4",
                descUz: "Qovurg'alararo mushaklar elastikligini va o'pkaning hayotiy sig'imini oshiradi.",
                descRu: "Улучшает экскурсию диафрагмы и подвижность реберно-позвоночных суставов.",
                descEn: "Restorative poses to improve intercostal muscle flexibility and thoracic mobility.",
                safetyTipUz: "Havo tozalagich (filtri) ishlab turgan toza xonada bajaring.",
                safetyTipRu: "Занимайтесь в чистой комнате с работающим очистителем воздуха.",
                safetyTipEn: "Perform in a clean room with an active air purifier.",
                intensityEn: "Light",
                intensityRu: "Лёгкая"
            },
            {
                id: 'ex-astma-5',
                title: "Diafragmani kuchaytiruvchi qorin nafasi",
                titleRu: "Диафрагмальное дыхание с легким сопротивлением",
                titleEn: "Diaphragmatic resistance breathing",
                duration: 15,
                calories: 30,
                intensity: "Juda yengil",
                icon: "refresh-outline",
                color: "#66BB6A",
                descUz: "Qoringa yengil kitob yoki qo'lni qo'yib nafas olish orqali nafas mushaklarini kuchaytiradi.",
                descRu: "Тренирует основную дыхательную мышцу, уменьшая одышку при повседневной активности.",
                descEn: "Strengthens main diaphragm muscle with light resistance, reducing dyspnea in daily life.",
                safetyTipUz: "Nafas siqishi boshlansa zudlik bilan to'xtating.",
                safetyTipRu: "При малейшей одышке или стеснении в груди немедленно прекратите.",
                safetyTipEn: "If chest tightness or shortness of breath begins, stop immediately.",
                intensityEn: "Very Light",
                intensityRu: "Очень лёгкая"
            }
        ],
        aiContext: {
            focusArea: "kislorod darajasi (SpO2), bronxospazm profilaktikasi, inxalyatordan to'g'ri foydalanish",
            specialRules: "Allergenlar va sovuq havoda mashq qilish xavfli ekanini eslat. SpO2 92% dan past bo'lsa darhol tez yordamga yo'naltir."
        }
    },

    'Umumiy': {
        key: 'umumiy',
        title: 'Umumiy Holat',
        titleRu: 'Общее здоровье',
        titleEn: 'General Wellness',
        icon: 'fitness-outline',
        color: '#00E676',
        chartTitle: "Yurak urishi (bpm)",
        chartTitleRu: "Пульс (уд/мин)",
        chartTitleEn: "Heart Rate (bpm)",
        metrics: [
            { key: 'heartRate', label: 'Yurak urishi', labelEn: 'Heart Rate', labelRu: 'Пульс', unit: 'bpm', icon: 'pulse-outline', color: '#FF5722', defaultVal: '' },
            { key: 'weight', label: 'Vazn', labelEn: 'Weight', labelRu: 'Вес', unit: 'kg', icon: 'barbell-outline', color: '#9C27B0', defaultVal: '' }
        ],
        limits: {
            heartRate: { low: 55, normalMin: 60, normalMax: 90, high: 100, critical: 130 }
        },
        diet: {
            name: "Sog'lom umumiy muvozanatli parhez",
            nameRu: "Общее здоровое сбалансированное питание",
            nameEn: "General Balanced Nutrition",
            tags: ['umumiy', 'muvozanatli'],
            allowedFoods: ["Meva va sabzavotlar", "Donli mahsulotlar", "Yog'siz go'sht va baliq", "Yong'oqlar", "Toza suv"],
            restrictedFoods: ["Haddan tashqari shakar", "Transyog'lar va yarimtayyor ovqatlar", "Fastfud"],
            allowedFoodsRu: ["Фрукты и овощи", "Цельнозерновые продукты", "Нежирное мясо и рыба", "Орехи", "Чистая вода"],
            allowedFoodsEn: ["Fresh fruits & vegetables", "Whole grains", "Lean meat and fish", "Nuts", "Pure clean water"],
            restrictedFoodsRu: ["Избыточный сахар", "Трансжиры и полуфабрикаты", "Фастфуд"],
            restrictedFoodsEn: ["Excess added sugars", "Trans fats & processed foods", "Fast food"],
            tipUz: "Kun davomida xilma-xil va yangi tayyorlangan ovqatlarni iste'mol qiling.",
            tipRu: "Соблюдайте баланс белков, жиров и медленных углеводов.",
            tipEn: "Maintain a balanced diet rich in micronutrients, antioxidants, and clean hydration."
        },
        medications: {
            diseaseKey: 'umumiy',
            quickMeds: [
                { name: 'Vitamin D3', dose: '2000 IU', time: 'ertalab', meal: 'ovqatdan_keyin', color: '#FFA726' },
                { name: 'Omega-3', dose: '1000 mg', time: 'ertalab', meal: 'ovqatdan_keyin', color: '#4A9EFF' },
                { name: 'Magniy B6', dose: '1 tab', time: 'kechqurun', meal: 'ovqatdan_keyin', color: '#00E676' }
            ]
        },
        exercises: [
            {
                id: 'ex-um-1',
                title: "Ertalabki 15 daqiqalik uyg'otuvchi badantarbiya",
                titleRu: "Утренняя 15-минутная зарядка",
                titleEn: "Morning 15-min wake-up routine",
                duration: 15,
                calories: 65,
                intensity: "Yengil",
                icon: "sunny-outline",
                color: "#FFA726",
                descUz: "Barcha asosiy bo'g'im va mushaklarni ishga tushiruvchi ertalabki tetiklantiruvchi mashqlar.",
                descRu: "Разминает суставы, улучшает настроение и обмен веществ на весь день.",
                descEn: "Morning invigorating full-body mobility activating all key joints and muscles.",
                safetyTipUz: "Keskin harakat qilmasdan sokin sur'atda bajaring.",
                safetyTipRu: "Выполняйте плавно без резких рывков.",
                safetyTipEn: "Perform smoothly without sudden or jerky movements.",
                intensityEn: "Light",
                intensityRu: "Лёгкая"
            },
            {
                id: 'ex-um-2',
                title: "10 000 qadam kunlik piyoda yurish",
                titleRu: "Ежедневная прогулка",
                titleEn: "Daily brisk walking",
                duration: 45,
                calories: 200,
                intensity: "O'rtacha",
                icon: "walk-outline",
                color: "#00E676",
                descUz: "Yurak, o'pka va qon tomirlar salomatligi uchun eng tabiiy va xavfsiz harakat.",
                descRu: "Универсальная тренировка для сердечно-сосудистой системы.",
                safetyTipUz: "Qulay poyabzal kiying."
            }
        ],
        aiContext: {
            focusArea: "sog'lom turmush tarzi, to'g'ri uyqu, kunlik faollik va immunitet",
            specialRules: "Profilaktika va sog'lom odatlarni shakllantirish bo'yicha maslahat ber."
        }
    }
};

export const getDiseaseConfig = (diseaseName) => {
    if (!diseaseName) return DISEASE_CONFIG['Umumiy'];
    
    // Direct match
    if (DISEASE_CONFIG[diseaseName]) {
        return DISEASE_CONFIG[diseaseName];
    }
    
    // Russian direct match translations
    const ruMap = {
        'Диабет': 'Diabet',
        'Гипертония': 'Gipertenziya',
        'Аритмия': 'Aritmiya',
        'Ожирение': 'Semizlik',
        'Астма': 'Astma'
    };
    if (ruMap[diseaseName]) {
        return DISEASE_CONFIG[ruMap[diseaseName]];
    }

    // English direct match translations
    const enMap = {
        'Diabetes': 'Diabet',
        'Hypertension': 'Gipertenziya',
        'Arrhythmia': 'Aritmiya',
        'Arrhythmia & Cardio': 'Aritmiya',
        'Obesity': 'Semizlik',
        'Metabolic & Obesity': 'Semizlik',
        'Asthma': 'Astma',
        'Asthma & Respiratory': 'Astma',
        'General': 'Umumiy'
    };
    if (enMap[diseaseName]) {
        return DISEASE_CONFIG[enMap[diseaseName]];
    }

    // Keyword matching for custom/voice input
    const lower = diseaseName.toLowerCase();
    if (lower.includes('diabet') || lower.includes('qand') || lower.includes('shakar') || lower.includes('диабет') || lower.includes('sugar') || lower.includes('glucose')) {
        return DISEASE_CONFIG['Diabet'];
    }
    if (lower.includes('gipertenziya') || lower.includes('qon bosimi') || lower.includes('давлен') || lower.includes('гиперт') || lower.includes('hypertens') || lower.includes('pressure')) {
        return DISEASE_CONFIG['Gipertenziya'];
    }
    if (lower.includes('aritmiya') || lower.includes('yurak') || lower.includes('сердц') || lower.includes('аритм') || lower.includes('arrhythm') || lower.includes('cardio')) {
        return DISEASE_CONFIG['Aritmiya'];
    }
    if (lower.includes('semiz') || lower.includes('vazn') || lower.includes('ozish') || lower.includes('ожирен') || lower.includes('вес') || lower.includes('obes') || lower.includes('weight')) {
        return DISEASE_CONFIG['Semizlik'];
    }
    if (lower.includes('astma') || lower.includes('nafas') || lower.includes('астм') || lower.includes('дыхан') || lower.includes('asthma') || lower.includes('breath')) {
        return DISEASE_CONFIG['Astma'];
    }

    // Default fallback
    return DISEASE_CONFIG['Umumiy'];
};

/**
 * Universal metric status evaluator
 * Evaluates any metric value against disease limits
 */
export const getMetricStatusForDisease = (diseaseConfig, metricKey, value) => {
    if (!value || isNaN(value)) {
        return { status: 'empty', label: 'Ma\'lumot yo\'q', labelRu: 'Нет данных', labelEn: 'No data', color: '#9E9E9E', icon: 'information-circle-outline' };
    }

    const num = parseFloat(value);
    const limits = diseaseConfig?.limits?.[metricKey];

    if (!limits) {
        return { status: 'normal', label: 'Me\'yor', labelRu: 'Норма', labelEn: 'Normal', color: '#00E676', icon: 'checkmark-circle' };
    }

    if (limits.critical && num >= limits.critical) {
        return { status: 'critical', label: 'Xavfli yuqori!', labelRu: 'Критически высоко!', labelEn: 'Dangerously high!', color: '#D32F2F', icon: 'alert-circle' };
    }
    if (limits.high && num >= limits.high) {
        return { status: 'high', label: 'Yuqori', labelRu: 'Высокий', labelEn: 'High', color: '#F44336', icon: 'arrow-up-circle' };
    }
    if (limits.low && num < limits.low) {
        return { status: 'low', label: 'Past', labelRu: 'Низкий', labelEn: 'Low', color: '#FFA726', icon: 'arrow-down-circle' };
    }
    return { status: 'normal', label: 'Me\'yor', labelRu: 'Норма', labelEn: 'Normal', color: '#00E676', icon: 'checkmark-circle' };
};

/**
 * Multilingual metric label getter
 */
export const getMetricLabel = (metricObj, lang = 'uz') => {
    if (!metricObj) return '';
    const l = (lang || '').toLowerCase();
    if (l.startsWith('en')) return metricObj.labelEn || metricObj.label;
    if (l.startsWith('ru')) return metricObj.labelRu || metricObj.label;
    return metricObj.label;
};
