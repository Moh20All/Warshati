// "What's new" shown once after an update (components/WhatsNew.jsx).
// Screenshots: src/renderer/src/assets/whats-new/<version>/<img>.png (Arabic, highlighted by the owner).
// Each slide: [image, page it opens, { ar|fr|en: [title, text] }]

const images = import.meta.glob('../assets/whats-new/*/*.png', { eager: true, import: 'default' })

const RELEASES = {
  '1.8.0': {
    slides: [
      ['01', '/repairs/tickets/new', {
        ar: ['اختر العطل بنقرة واحدة', 'في وصف المشكلة، قائمة جاهزة بالأعطال الشائعة (شاشة مكسورة، لا يشحن، البطارية تفرغ بسرعة…) بلا كتابة.'],
        fr: ['Choisissez la panne en un clic', 'Dans la description du problème, une liste des pannes courantes (écran cassé, ne charge pas, batterie se vide vite…) : plus besoin d\'écrire.'],
        en: ['Pick the problem in one click', 'In the issue description, a ready list of common problems (broken screen, not charging, battery drains fast…). No typing.']
      }],
      ['02', '/repairs/tickets', {
        ar: ['كل تصليح يعرف مصلّحه… وحصته تلقائياً', 'اختر المصلّح في التذكرة، والبرنامج يحسب حصته وحده.'],
        fr: ['Chaque réparation a son réparateur… et sa part', 'Choisissez le réparateur sur le ticket : l\'app calcule sa part toute seule.'],
        en: ['Every repair has its repairman… and his share', 'Pick the repairman on the ticket: the app works out his share by itself.']
      }],
      ['03', '/settings/repairmen', {
        ar: ['حساب المصلّح واضح: ربح، دفع، باقي', 'صفحة لكل مصلّح فيها المستحق، المدفوع والباقي، مع زر تسجيل الدفع.'],
        fr: ['Le compte du réparateur : gagné, payé, reste', 'Une page par réparateur avec ce qu\'il a gagné, ce qui est payé et ce qui reste, et un bouton pour noter un paiement.'],
        en: ['The repairman\'s account: earned, paid, left', 'A page for each repairman with what he earned, what is paid and what is left, plus a button to record a payment.']
      }],
      ['04', '/repairs/tickets', {
        ar: ['وصل التسليم بنقرة واحدة', 'عند تسليم الجهاز: المبلغ المدفوع، الباقي، نهاية الضمان وسطر لتوقيع الزبون.'],
        fr: ['Le bon de livraison en un clic', 'À la remise de l\'appareil : ce qui est payé, ce qui reste, la fin de garantie et une ligne pour la signature du client.'],
        en: ['The delivery receipt in one click', 'When the device is handed back: what was paid, what is left, the warranty end date and a line for the client\'s signature.']
      }],
      ['05', '/repairs/tickets', {
        ar: ['ملصق بالباركود لكل جهاز', 'رقم التذكرة، الباركود، الزبون والجهاز. امسحه وتفتح التذكرة مباشرة.'],
        fr: ['Une étiquette code-barres pour chaque appareil', 'Numéro du ticket, code-barres, client et appareil. Scannez-la et le ticket s\'ouvre directement.'],
        en: ['A barcode sticker for every device', 'Ticket number, barcode, client and device. Scan it and the ticket opens straight away.']
      }],
      ['06', '/sales/pos', {
        ar: ['الزبون عطاك 5000؟ الباقي بنقرة', 'أزرار جاهزة تحت المبلغ في نقطة البيع (بالضبط، 5000، 6000…) والباقي يظهر وحده.'],
        fr: ['Le client vous donne 5000 ? La monnaie en un clic', 'Des boutons sous le montant à la caisse (exact, 5000, 6000…) et la monnaie à rendre s\'affiche toute seule.'],
        en: ['The client gives you 5000? Change in one click', 'Ready buttons under the amount at the POS (exact, 5000, 6000…) and the change shows by itself.']
      }],
      ['07', '/finance/daily-close', {
        ar: ['اعرف كم لازم يكون في الصندوق', 'رصيد الصندوق الافتتاحي: تحدد المبلغ كل صباح، والإغلاق اليومي يحسب ما يجب أن يكون في الصندوق. والربح الصافي يخصم حصة المصلّح.'],
        fr: ['Sachez combien il doit y avoir dans la caisse', 'Fond de caisse : le montant mis chaque matin, et la clôture du jour calcule ce qui doit être dans la caisse. Le bénéfice net déduit la part du réparateur.'],
        en: ['Know how much should be in the drawer', 'Opening cash: the amount you put in each morning, and the daily close works out what should be in the drawer. Net profit takes off the repairman\'s share.']
      }],
      ['08', '/finance/suppliers', {
        ar: ['ديون الموردين في نظرة واحدة', 'الباقي للدفع لكل مورد، ومجموع الديون فوق.'],
        fr: ['Les dettes fournisseurs d\'un coup d\'œil', 'Ce qui reste à payer à chaque fournisseur, et le total en haut.'],
        en: ['Supplier debts at a glance', 'What is left to pay each supplier, and the total at the top.']
      }],
      ['10', '/inventory/accessories', {
        ar: ['1025 إكسسوار جاهز بالصور', 'كتالوج إكسسوارات مصنّف بالصور. أضف أي إكسسوار لمخزونك، والسعر المعروض مجرد اقتراح من السوق: أنت من يحدد سعرك.'],
        fr: ['1025 accessoires prêts, avec photos', 'Un catalogue d\'accessoires classé avec photos. Ajoutez-en à votre stock : le prix affiché n\'est qu\'une suggestion du marché, c\'est vous qui fixez votre prix.'],
        en: ['1025 accessories ready, with photos', 'An accessory catalog sorted by category, with photos. Add any to your stock: the price shown is only a market suggestion, you set your own.']
      }],
      ['12', '/settings/catalog', {
        ar: ['الصور تتحمّل مرة… وتبقى عندك', 'صور الهواتف والإكسسوارات تُحمَّل مرة واحدة وتعمل بلا إنترنت.'],
        fr: ['Les photos se téléchargent une fois… et restent', 'Les photos des téléphones et des accessoires se téléchargent une seule fois et marchent sans internet.'],
        en: ['Photos download once… and stay', 'Phone and accessory photos download once and work without internet.']
      }],
      ['13', '/settings/store', {
        ar: ['شعار محلك الآن في كل مكان', 'ضع شعار محلك ليُطبع على الوصولات والتذاكر بدل شعار ورشتي، وفعّل فقط الخصائص التي تحتاجها.'],
        fr: ['Le logo de votre boutique partout', 'Ajoutez votre logo : il s\'imprime sur les reçus et les tickets à la place du logo Warshati. Et activez seulement les fonctions dont vous avez besoin.'],
        en: ['Your shop\'s logo everywhere', 'Add your logo: it prints on receipts and tickets instead of the Warshati logo. And switch on only the features you need.']
      }],
      ['14', '/settings/about', {
        ar: ['صفحة «حول» الجديدة', 'الدعم عبر واتساب، فيديوهات الشرح على يوتيوب وروابطنا.'],
        fr: ['La nouvelle page « À propos »', 'Le support WhatsApp, les vidéos de démonstration sur YouTube et tous nos liens.'],
        en: ['The new About page', 'WhatsApp support, demo videos on YouTube and all our links.']
      }]
    ],
    also: {
      ar: ['الضمان الافتراضي أصبح 5 أيام', 'النوافذ الطويلة قابلة للتمرير', 'أرقام الهاتف تظهر صحيحة بالعربية', 'رأس الورقة يضع الشعار بجانب معلومات المحل'],
      fr: ['La garantie par défaut est maintenant de 5 jours', 'Les longues fenêtres défilent', 'Les numéros de téléphone s\'affichent correctement en arabe', 'L\'en-tête des papiers met le logo à côté des infos de la boutique'],
      en: ['The default warranty is now 5 days', 'Long windows scroll', 'Phone numbers show correctly in Arabic', 'The paper header puts the logo beside the shop details']
    }
  }
}

const langOf = (lang) => (['ar', 'fr', 'en'].includes(String(lang).slice(0, 2)) ? String(lang).slice(0, 2) : 'en')

/** The release notes of a version in a language: { version, slides: [{ image, route, title, text }], also: [] }, or null */
export function whatsNew(version, lang) {
  const r = RELEASES[version]
  if (!r) return null
  const l = langOf(lang)
  return {
    version,
    slides: r.slides.map(([img, route, texts]) => ({ image: images[`../assets/whats-new/${version}/${img}.png`], route, title: texts[l][0], text: texts[l][1] })),
    also: r.also[l]
  }
}

/** Newest version that has release notes (for the About page) */
export const latestNotes = () => Object.keys(RELEASES).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))[0]
