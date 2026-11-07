/* @ds-bundle: {"format":4,"namespace":"Warshati","components":[{"name":"Icon"},{"name":"Button"},{"name":"Input"},{"name":"Field"},{"name":"Select"},{"name":"Checkbox"},{"name":"MoneyInput"},{"name":"Combobox"},{"name":"SegmentedSwitch"},{"name":"Tabs"},{"name":"Badge"},{"name":"StatusBadge"},{"name":"VfmBadge"},{"name":"Money"},{"name":"Alert"},{"name":"Toast"},{"name":"Modal"},{"name":"ConfirmModal"},{"name":"ModalStack"},{"name":"Card"},{"name":"PageHeader"},{"name":"StatCard"},{"name":"Table"},{"name":"EmptyState"},{"name":"DevicePicker"},{"name":"PosPayment"},{"name":"PaymentHistory"},{"name":"WhatsAppButton"},{"name":"Sidebar"},{"name":"Header"},{"name":"AppShell"},{"name":"Receipt"},{"name":"A4Report"},{"name":"AdminShell"},{"name":"AdminSidebar"},{"name":"Initials"},{"name":"KeyField"},{"name":"FilterChips"},{"name":"ActivityFeed"},{"name":"BarList"},{"name":"Stepper"},{"name":"Skeleton"}]} */
(function () {
  var R = window.React, h = R.createElement, F = R.Fragment;
  function cx() { return Array.prototype.filter.call(arguments, Boolean).join(' '); }
  function pick(lang, en, fr, ar) { return lang === 'ar' ? ar : lang === 'fr' ? fr : en; }

  /* ---------- labels copied from the app's translation files ---------- */
  var DICT = {
    en: { dir: 'ltr', currency: 'DZD', cancel: 'Cancel', confirm: 'Confirm', close: 'Close', search: 'Search...', phone: 'Phone', laptop: 'Laptop', console: 'Console', brand: 'Choose a brand...', model: 'Choose a model...', allModels: 'Search all models...', manual: 'Type manually', fromList: 'Choose from list', details: 'Details', addedByHand: 'added by hand', notInList: 'Not in the list? Type it manually', useTyped: 'Use "%s" (type manually)', brandL: 'Brand', modelL: 'Model', payMethod: 'Payment Method', cash: 'Cash', creditFull: 'Credit (Full)', split: 'Split (Cash + Credit)', amountPaid: 'Amount Paid', change: 'Change', missing: '%s is missing.', restDebt: 'Record the rest as a debt', willAdd: '%a will be added to %n\'s debt', willOwe: '%a will be owed — choose the customer above first', subtotal: 'Subtotal', discount: 'Discount', tradeCredit: 'Trade-in Credit', total: 'Total', completeSale: 'Complete Sale', date: 'Date', amount: 'Amount', note: 'Note', receipt: 'Receipt', cancelPay: 'Cancel payment', cancellingEntry: 'Cancelling entry', cancelled: 'Cancelled', owner: 'Owner', staff: 'Staff', feedback: 'Send Feedback', logout: 'Logout' },
    fr: { dir: 'ltr', currency: 'DZD', cancel: 'Annuler', confirm: 'Confirmer', close: 'Fermer', search: 'Rechercher...', phone: 'Téléphone', laptop: 'PC portable', console: 'Console', brand: 'Choisir une marque...', model: 'Choisir un modèle...', allModels: 'Rechercher tous les modèles...', manual: 'Saisir manuellement', fromList: 'Choisir dans la liste', details: 'Détails', addedByHand: 'ajouté à la main', notInList: 'Pas dans la liste ? Saisissez-le', useTyped: 'Utiliser « %s » (saisie manuelle)', brandL: 'Marque', modelL: 'Modèle', payMethod: 'Mode de paiement', cash: 'Espèces', creditFull: 'Crédit (Totalité)', split: 'Mixte (Espèces + Crédit)', amountPaid: 'Montant payé', change: 'Monnaie', missing: 'Il manque %s.', restDebt: 'Mettre le reste en dette', willAdd: '%a sera ajouté à la dette de %n', willOwe: '%a sera dû — choisissez d\'abord le client', subtotal: 'Sous-total', discount: 'Remise', tradeCredit: 'Crédit reprise', total: 'Total', completeSale: 'Valider la vente', date: 'Date', amount: 'Montant', note: 'Note', receipt: 'Reçu', cancelPay: 'Annuler le paiement', cancellingEntry: 'Écriture d\'annulation', cancelled: 'Annulé', owner: 'Propriétaire', staff: 'Personnel', feedback: 'Send Feedback', logout: 'Logout' },
    ar: { dir: 'rtl', currency: 'د.ج', cancel: 'إلغاء', confirm: 'تأكيد', close: 'إغلاق', search: 'بحث...', phone: 'هاتف', laptop: 'حاسوب', console: 'جهاز ألعاب', brand: 'اختر العلامة...', model: 'اختر الطراز...', allModels: 'ابحث في كل الطرازات...', manual: 'كتابة يدوية', fromList: 'اختيار من القائمة', details: 'التفاصيل', addedByHand: 'أضيف يدوياً', notInList: 'غير موجود؟ اكتبه يدوياً', useTyped: 'استعمال «%s» (كتابة يدوية)', brandL: 'العلامة', modelL: 'الطراز', payMethod: 'طريقة الدفع', cash: 'نقداً', creditFull: 'كريدي (بالكامل)', split: 'مختلط (نقداً + كريدي)', amountPaid: 'المبلغ المدفوع', change: 'الباقي للزبون', missing: 'ينقص %s.', restDebt: 'تسجيل الباقي كدين', willAdd: 'سيُضاف %a إلى دين %n', willOwe: 'سيبقى %a ديناً — اختر الزبون أولاً', subtotal: 'المجموع الفرعي', discount: 'التخفيض', tradeCredit: 'رصيد الاستبدال', total: 'المجموع', completeSale: 'إتمام البيع', date: 'التاريخ', amount: 'المبلغ', note: 'ملاحظة', receipt: 'وصل', cancelPay: 'إلغاء الدفعة', cancellingEntry: 'قيد إلغاء', cancelled: 'ملغى', owner: 'مالك', staff: 'موظف', feedback: 'Send Feedback', logout: 'Logout' }
  };
  function t(lang, k) { return (DICT[lang] || DICT.en)[k] || DICT.en[k] || k; }

  var STATUS = {"ticket": {"diagnosing": ["blue", "search", "Diagnosing", "En diagnostic", "جاري التشخيص"], "waiting-parts": ["amber", "box", "Waiting Parts", "En attente de pièces", "بانتظار القطع"], "in-repair": ["teal", "wrench", "In Repair", "En réparation", "في الإصلاح"], "done": ["lime", "check-circle", "Done", "Terminé", "مكتمل"], "delivered": ["gray", "hand", "Delivered", "Livré", "تم التسليم"], "cancelled": ["red", "slash", "Cancelled", "Annulé", "ملغى"]}, "priority": {"low": ["gray", "chev-down", "Low", "Basse", "منخفضة"], "normal": ["blue", "minus", "Normal", "Normale", "عادية"], "urgent": ["red", "bolt", "Urgent", "Urgente", "عاجلة"]}, "debt": {"open": ["red", "alert", "Open", "Ouvert", "مفتوح"], "partial": ["amber", "half", "Partial", "Partiel", "جزئي"], "settled": ["green", "check-circle", "Settled", "Réglé", "مسدد"]}, "payment": {"cancelling-entry": ["red", "undo", "Cancelling entry", "Écriture d'annulation", "قيد إلغاء"], "cancelled": ["amber", "slash", "Cancelled", "Annulé", "ملغى"]}, "po": {"unpaid": ["red", "alert", "Unpaid", "Impayé", "غير مدفوع"], "partial": ["amber", "half", "Partial", "Partiel", "جزئي"], "paid": ["green", "check-circle", "Paid", "Payé", "مدفوع"], "opening-balance": ["violet", "clock", "Opening balance", "Solde d'ouverture", "رصيد سابق"]}, "sale": {"completed": ["green", "check-circle", "Completed", "Terminée", "مكتملة"], "credit": ["amber", "wallet", "Credit", "Crédit", "كريدي"], "refunded": ["red", "undo", "Refunded", "Remboursée", "مُستردّة"]}, "condition": {"excellent": ["teal", "star", "Excellent", "Excellent", "ممتاز"], "good": ["green", "check", "Good", "Bon", "جيد"], "fair": ["amber", "scratch", "Fair", "Moyen", "متوسط"], "poor": ["orange", "alert", "Poor", "Médiocre", "ضعيف"], "broken": ["red", "tool", "Broken", "Cassé", "مكسور"]}, "tradein": {"appraised": ["blue", "tag", "Appraised", "Évalué", "تم التقييم"], "accepted": ["green", "check-circle", "Accepted", "Accepté", "مقبول"], "rejected": ["red", "x-circle", "Rejected", "Rejeté", "مرفوض"]}, "checkin": {"pending": ["amber", "clock", "Pending", "En attente", "قيد الانتظار"], "converted": ["green", "check-circle", "Converted", "Converti", "مُحوّل"]}, "warranty": {"within": ["green", "shield", "Within Warranty", "Sous garantie", "ضمن الضمان"], "expired": ["red", "x-circle", "Expired", "Expiré", "منتهي الصلاحية"]}, "followup": {"ticket-created": ["blue", "wrench", "Ticket Created", "Ticket créé", "تم إنشاء تذكرة"], "pending": ["gray", "clock", "Pending", "En attente", "قيد الانتظار"]}, "stock": {"low": ["red", "alert", "Low Stock", "Stock bas", "مخزون منخفض"]}, "user": {"active": ["green", "check-circle", "Active", "Actif", "نشط"], "inactive": ["gray", "slash", "Inactive", "Inactif", "غير نشط"]}, "license": {"activated": ["green", "check-circle", "Activated", "Activé", "مفعّل"], "waiting": ["amber", "clock", "Waiting", "En attente", "في الانتظار"], "quiet": ["orange", "moon", "Quiet", "Silencieux", "غير نشط"], "revoked": ["gray", "slash", "Revoked", "Révoqué", "ملغى"]}, "feedback": {"new": ["blue", "info", "New", "Nouveau", "جديد"], "seen": ["gray", "eye", "Seen", "Vu", "تمت المشاهدة"], "done": ["green", "check-circle", "Done", "Traité", "تم"]}, "fbtype": {"bug": ["orange", "bug", "Bug", "Bug", "خلل"], "suggestion": ["amber", "bulb", "Suggestion", "Suggestion", "اقتراح"], "other": ["blue", "message", "Other", "Autre", "أخرى"]}, "crash": {"open": ["red", "bug", "Open", "Ouvert", "مفتوح"], "fixed": ["green", "check-circle", "Fixed", "Corrigé", "تم الإصلاح"]}, "vfm": {"performance-beast": ["blue", "bolt", "Performance Beast", "Bête de performance", "هارب في الأداء"], "value-king": ["green", "star", "Value King", "Excellent rapport qualité-prix", "قيمة جيدة مقارنة بالسعر"], "average": ["gray", "minus", "Average Value", "Rapport moyen", "متوسط"], "overpriced": ["red", "alert", "Overpriced", "Trop cher pour sa valeur", "غالي على قيمته"]}};

  /* ---------- icons: original 24px line set, 1.75 stroke ---------- */
  var P = {
    wrench: 'M14.5 6.5a4 4 0 0 0 5 5L13 18a2.1 2.1 0 0 1-3-3l6.5-6.5M14.5 6.5 17 4l3 3-2.5 2.5M4 20l4-4',
    phone: 'M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM11 18h2',
    laptop: 'M5 5h14v10H5zM3 19h18M10 17h4',
    gamepad: 'M7 8h10a4 4 0 0 1 4 4v2a3 3 0 0 1-5.4 1.8L14 14h-4l-1.6 1.8A3 3 0 0 1 3 14v-2a4 4 0 0 1 4-4ZM8 11v3M6.5 12.5h3M15 12h.01M17 13.5h.01',
    device: 'M6 4h12v16H6zM10 17h4',
    search: 'M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14ZM20 20l-4-4',
    plus: 'M12 5v14M5 12h14', minus: 'M5 12h14',
    check: 'M5 12.5 10 17 19 7', 'check-circle': 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18ZM8 12.5l3 3 5-6',
    x: 'M6 6l12 12M18 6 6 18', 'x-circle': 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18ZM9 9l6 6M15 9l-6 6',
    alert: 'M12 4 21 19H3ZM12 10v4M12 16.5v.01',
    info: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18ZM12 11v5M12 8v.01',
    clock: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18ZM12 7v5l3 2',
    cart: 'M3 4h2l2 11h11l2-8H6.5M9 19.5h.01M17 19.5h.01',
    cash: 'M3 7h18v10H3zM12 9.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM6 10v4M18 10v4',
    card: 'M3 6h18v12H3zM3 10h18M7 15h4',
    user: 'M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8ZM4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5',
    'user-q': 'M10 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8ZM3 20c1.2-3 3.8-4.6 7-4.6M17 14.5a2 2 0 1 1 2 2v1M19 20.5v.01',
    users: 'M9 5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7ZM2.5 19.5c1.2-3 3.7-4.5 6.5-4.5s5.3 1.5 6.5 4.5M16 5.3a3.5 3.5 0 0 1 0 6.4M18 15.2c1.6.6 2.8 2 3.5 4.3',
    box: 'M4 7.5 12 3l8 4.5v9L12 21l-8-4.5ZM4 7.5 12 12l8-4.5M12 12v9',
    truck: 'M3 6h11v10H3zM14 9h4l3 3v4h-7M7 18.5h.01M17 18.5h.01',
    chart: 'M4 20V10M10 20V4M16 20v-7M21 20H3',
    settings: 'M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6ZM12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1',
    print: 'M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z',
    receipt: 'M6 3h12v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5L6 21ZM9 8h6M9 12h6M9 16h3',
    swap: 'M4 8h13l-3-3M20 16H7l3 3',
    lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
    key: 'M8 11a4 4 0 1 1 0 .01M11.5 13.5 20 5M16 9l2.5 2.5M18 7l2 2',
    'chev-down': 'M6 9l6 6 6-6', 'chev-up': 'M6 15l6-6 6 6', 'chev-end': 'M9 6l6 6-6 6',
    trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
    undo: 'M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
    calendar: 'M4 5h16v15H4zM4 9h16M8 3v4M16 3v4',
    logout: 'M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10',
    moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z', sun: 'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8ZM12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
    globe: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18ZM3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9S9.5 5.5 12 3Z',
    edit: 'M4 20h4L19 9l-4-4L4 16ZM13.5 6.5l4 4',
    tag: 'M3 12V4h8l10 10-8 8ZM7.5 7.5h.01',
    home: 'M4 11 12 4l8 7v9h-5v-6H9v6H4Z',
    wallet: 'M4 6h14a2 2 0 0 1 2 2v10H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1ZM16 13h.01M4 6l10-3 1 3',
    store: 'M4 9 5.5 4h13L20 9M4 9h16v2a3 3 0 0 1-5.3 2 3 3 0 0 1-5.4 0A3 3 0 0 1 4 11ZM5 13v7h14v-7M10 20v-4h4v4',
    inbox: 'M4 13 6.5 5h11L20 13v6H4ZM4 13h5l1 2h4l1-2h5',
    hand: 'M7 12V6.5a1.5 1.5 0 0 1 3 0V11M10 10V4.5a1.5 1.5 0 0 1 3 0V11M13 10.5V5.5a1.5 1.5 0 0 1 3 0V12M16 10.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-2.7L4 15a1.5 1.5 0 0 1 2.4-1.8L7 14',
    slash: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18ZM5.6 18.4 18.4 5.6',
    bolt: 'M13 3 5 13.5h6L10 21l8-10.5h-6Z',
    half: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18ZM12 3v18',
    star: 'M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8Z',
    sparkle: 'M12 3v5M12 16v5M3 12h5M16 12h5M7 7l2 2M15 15l2 2M17 7l-2 2M9 15l-2 2',
    scratch: 'M5 19 19 5M9 19l10-10M5 15 15 5',
    tool: 'M4 20l7-7M14 4l6 6-3 3-6-6ZM11 13l-2-2',
    send: 'M4 12 20 4l-6 16-3-7Z',
    whatsapp: 'M4 20l1.3-4A8.5 8.5 0 1 1 8.4 19ZM9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2-1-1 .9c-1.2-.5-2.3-1.6-2.8-2.8l.9-1-1-2Z',
    download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
    list: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
    grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
    filter: 'M4 5h16l-6 7v6l-4 2v-8Z',
    shield: 'M12 3 20 6v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6Z'
  };

  P.bell = 'M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15ZM10 20.5h4';
  P.mail = 'M3 6h18v12H3zM3 7l9 6 9-6';
  P.message = 'M4 5h16v11H9l-5 4Z';
  P.image = 'M4 5h16v14H4zM4 16l5-5 4 4 2-2 5 5M15.5 9h.01';
  P.file = 'M6 3h8l4 4v14H6ZM14 3v4h4M9 12h6M9 16h6';
  P.collapse = 'M15 6l-6 6 6 6';
  P.refresh = 'M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6';
  P.devices = 'M3 6h12v9H3zM1 18h16M17 9h5v11h-5z';
  P.bug = 'M8 9h8v7a4 4 0 0 1-8 0ZM9 9V7a3 3 0 0 1 6 0v2M4 13h4M16 13h4M5 8l3 2M19 8l-3 2M5 19l3-2M19 19l-3-2';
  P.bulb = 'M9 18h6M10 21h4M12 3a6 6 0 0 1 3.5 10.9c-.6.5-1 1.2-1 2V16h-5v-.1c0-.8-.4-1.5-1-2A6 6 0 0 1 12 3Z';
  P.eye = 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12ZM12 9.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z';
  P.copy = 'M9 9h11v11H9zM5 15H4V4h11v1';
  P.more = 'M5 12h.01M12 12h.01M19 12h.01';
  P.menu = 'M4 6h16M4 12h16M4 18h16';
  P.phonecall = 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z';
  P.link = 'M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1';
  P.unlink = 'M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6M3 3l18 18';
  P.book = 'M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4ZM20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6Z';
  P.sort = 'M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4';
  P.cpu = 'M7 7h10v10H7zM10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4';
  var FLIP = { 'chev-end': 1, undo: 1, send: 1, logout: 1, collapse: 1 };
  function Icon(p) {
    var d = P[p.name] || P.info;
    return h('svg', { className: cx('w-icon', FLIP[p.name] && 'w-flip', p.className), viewBox: '0 0 24 24', 'aria-hidden': p.label ? null : 'true', role: p.label ? 'img' : null, 'aria-label': p.label || null, style: p.size ? { width: p.size, height: p.size } : null },
      d.split('M').filter(Boolean).map(function (s, i) { return h('path', { key: i, d: 'M' + s }); }));
  }

  /* ---------- ui/Button: primary · secondary · danger · ghost · outline (+ flux) · sm/md/lg · loading ---------- */
  function Button(p) {
    var v = p.variant || 'primary', sz = p.size || 'md';
    return h('button', { type: p.type || 'button', className: cx('w-btn', 'w-btn-' + v, 'w-btn-' + sz, p.block && 'w-btn-block', p.iconOnly && 'w-btn-icon', p.className), disabled: p.disabled || p.loading, onClick: p.onClick, title: p.title || p.label, 'aria-label': p.iconOnly ? p.label : null, style: p.style },
      p.loading ? h('span', { className: 'w-spin', 'aria-hidden': 'true' }) : p.icon && h(Icon, { name: p.icon }), p.iconOnly ? null : p.children);
  }
  function WhatsAppButton(p) {
    return h('a', { className: cx('w-btn', 'w-btn-whatsapp', 'w-btn-' + (p.size || 'md'), p.iconOnly && 'w-btn-icon'), href: '#', title: p.label || 'WhatsApp', 'aria-label': p.label || 'WhatsApp', style: { textDecoration: 'none' } },
      h(Icon, { name: 'whatsapp' }), p.iconOnly ? null : p.children);
  }

  /* ---------- ui/Input (h-9, left/right icon, error, help) ---------- */
  function Field(p) {
    return h('label', { className: 'w-field', style: p.style },
      p.label && h('span', { className: 'w-label' }, p.label, p.required && h('span', { className: 'w-req', 'aria-hidden': 'true' }, ' *')),
      p.children,
      p.error ? h('span', { className: 'w-err' }, h(Icon, { name: 'alert', size: 14 }), p.error) : p.help && h('span', { className: 'w-hint' }, p.help));
  }
  function Input(p) {
    var inp = h(p.multiline ? 'textarea' : 'input', { className: cx('w-input', p.error && 'is-error', p.mono && 'w-mono', p.center && 'w-center', p.leftIcon && 'has-l', p.rightIcon && 'has-r'), defaultValue: p.value, placeholder: p.placeholder, readOnly: p.readOnly, type: p.type || 'text', dir: p.dir, autoFocus: p.autoFocus, rows: p.rows || 3 });
    var box = (p.leftIcon || p.rightIcon) ? h('span', { className: 'w-inputwrap' }, p.leftIcon && h('span', { className: 'w-in-l' }, h(Icon, { name: p.leftIcon, size: 16 })), inp, p.rightIcon && h('span', { className: 'w-in-r' }, h(Icon, { name: p.rightIcon, size: 16 }))) : inp;
    if (!p.label && !p.error && !p.help) return box;
    return h(Field, { label: p.label, required: p.required, error: p.error, help: p.help, style: p.style }, box);
  }
  function fmt(n) {
    var neg = n < 0, s = Math.abs(Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return (neg ? '−' : '') + s;
  }
  function MoneyInput(p) {
    var box = h('div', { className: 'w-affix w-money' }, h('input', { className: 'w-input', defaultValue: p.value != null ? fmt(p.value) : '', placeholder: p.placeholder != null ? fmt(p.placeholder) : '0', inputMode: 'numeric' }), h('span', { className: 'w-affix-end' }, t(p.lang || 'en', 'currency')));
    if (!p.label) return box;
    return h(Field, { label: p.label, required: p.required, help: p.help }, box);
  }
  function Select(p) {
    var box = h('div', { className: 'w-selectwrap' }, h('select', { className: 'w-input w-select', defaultValue: p.value }, (p.options || []).map(function (o) { return h('option', { key: o, value: o }, o); })), h(Icon, { name: 'chev-down' }));
    if (!p.label) return box;
    return h(Field, { label: p.label, required: p.required }, box);
  }
  function Checkbox(p) {
    var s = R.useState(!!p.checked), on = s[0], set = s[1];
    return h('span', { className: 'w-check', role: 'checkbox', 'aria-checked': String(on), tabIndex: 0, onClick: function () { set(!on); } }, h('span', { className: cx('w-check-box', on && 'is-on') }, on && h(Icon, { name: 'check' })), h('span', null, p.label));
  }

  /* ---------- ui/Combobox: searchable list, ignores case and accents ---------- */
  function Combobox(p) {
    return h('div', { className: 'w-combo' },
      h('div', { className: cx('w-input', 'w-combo-in', p.open && 'is-open') }, h('span', { className: p.value ? null : 'w-muted' }, p.value || p.placeholder), h(Icon, { name: 'chev-down', size: 16 })),
      p.open && h('div', { className: 'w-combo-list', role: 'listbox' },
        p.query != null && h('div', { className: 'w-combo-q' }, h(Icon, { name: 'search', size: 14 }), h('span', null, p.query || '')),
        (p.items || []).map(function (it, i) {
          return h('div', { key: i, role: 'option', className: cx('w-combo-item', i === (p.highlight || 0) && 'is-hi', it.manual && 'is-manual') },
            it.photo !== undefined && h('span', { className: 'w-combo-ph' }, h(Icon, { name: it.manual ? 'edit' : 'phone', size: 16 })),
            h('span', { className: 'w-combo-main' }, h('span', null, it.label), it.sub && h('span', { className: 'w-combo-sub' }, it.sub)),
            it.badge && h('span', { className: 'w-combo-badge' }, it.badge), it.count && h('span', { className: 'w-combo-sub' }, it.count));
        })));
  }
  function SegmentedSwitch(p) {
    var s = R.useState(p.value != null ? p.value : p.options[0].value), v = s[0], set = s[1];
    return h('div', { className: cx('w-seg', p.block && 'w-seg-block', p.vertical && 'w-seg-v'), role: 'group', 'aria-label': p.label },
      p.options.map(function (o) { return h('button', { key: o.value, type: 'button', 'aria-pressed': String(o.value === v), onClick: function () { set(o.value); } }, o.icon && h(Icon, { name: o.icon, size: 16 }), o.label); }));
  }
  function Tabs(p) {
    var s = R.useState(p.value || p.tabs[0].value), v = s[0], set = s[1];
    return h('div', { className: 'w-tabs', role: 'tablist' }, p.tabs.map(function (tb) {
      return h('button', { key: tb.value, role: 'tab', className: 'w-tab', 'aria-selected': String(tb.value === v), onClick: function () { set(tb.value); } }, tb.icon && h(Icon, { name: tb.icon, size: 16 }), tb.label, tb.count != null && h('span', { className: 'w-count' }, tb.count));
    }));
  }

  /* ---------- ui/Badge + translated status badges ---------- */
  function Badge(p) {
    return h('span', { className: cx('w-badge', 'w-badge-' + (p.variant || 'default'), p.strike && 'w-strike'), style: p.style }, p.dot && h('i', { className: 'w-dot' }), p.icon && h(Icon, { name: p.icon }), p.children);
  }
  function StatusBadge(p) {
    var lang = p.lang || 'en', g = STATUS[p.kind] || {}, s = g[p.value];
    if (!s) return h(Badge, null, p.value);
    var tok = 'color-' + p.kind + '-' + p.value;
    return h('span', { className: cx('w-badge', p.kind === 'payment' && p.value === 'cancelled' && 'w-strike'), style: { background: 'var(--' + tok + '-bg)', color: 'var(--' + tok + '-fg)' } },
      h(Icon, { name: s[1] }), pick(lang, s[2], s[3], s[4]));
  }
  function VfmBadge(p) {
    var lang = p.lang || 'en', s = STATUS.vfm[p.value], tok = 'color-vfm-' + p.value;
    return h('span', { className: 'w-vfm' }, h(StatusBadge, { kind: 'vfm', value: p.value, lang: lang }),
      p.score != null && h('span', { className: 'w-score', title: 'Score ' + p.score + ' / 100' }, h('span', { className: 'w-score-bar' }, h('i', { style: { width: p.score + '%', background: 'var(--' + tok + '-fg)' } })), h('span', { className: 'w-num w-cap' }, p.score + '%')));
  }
  function Money(p) {
    var lang = p.lang || 'en';
    var v = h('span', { className: 'w-amt', dir: lang === 'ar' ? 'rtl' : 'ltr', style: p.style }, h('span', { className: 'w-num' }, fmt(p.value)), ' ', t(lang, 'currency'));
    return p.strong ? h('strong', null, v) : v;
  }

  /* ---------- feedback ---------- */
  var AICON = { error: 'alert', warning: 'alert', success: 'check-circle', info: 'info' };
  function Alert(p) {
    var tone = p.tone || 'info';
    return h('div', { className: 'w-alert w-alert-' + tone, role: tone === 'error' ? 'alert' : 'status' },
      h(Icon, { name: p.icon || AICON[tone] }), h('div', { style: { flex: 1 } }, p.title && h('b', null, p.title), p.children), p.action && h('div', { className: 'w-alert-act' }, p.action));
  }
  function Toast(p) {
    var tone = p.tone || 'success';
    return h('div', { className: 'w-toast w-toast-' + tone, role: 'status' }, h(Icon, { name: AICON[tone === 'error' ? 'error' : tone] }), h('span', { style: { flex: 1 } }, p.children), h('button', { className: 'w-toast-x', 'aria-label': 'Close' }, h(Icon, { name: 'x', size: 14 })));
  }

  /* ---------- ui/Modal (sm/md/lg/xl), ConfirmModal, stacking ---------- */
  var MW = { sm: 400, md: 520, lg: 720, xl: 960 };
  function Modal(p) {
    return h('div', { className: 'w-modal', role: 'dialog', 'aria-modal': 'true', style: { width: MW[p.size || 'md'] } },
      h('div', { className: 'w-modal-head' }, h('h2', null, p.title), h(Button, { variant: 'ghost', size: 'sm', iconOnly: true, icon: 'x', label: 'Close' })),
      h('div', { className: 'w-modal-body' }, p.children),
      p.footer && h('div', { className: 'w-modal-foot' }, p.footer));
  }
  function ConfirmModal(p) {
    return h(Modal, { size: 'sm', title: p.title || 'Are you sure?', footer: h(F, null, h(Button, { variant: 'outline' }, p.cancelText || 'Cancel'), h(Button, { variant: p.danger ? 'danger' : 'primary' }, p.confirmText || 'Confirm')) }, h('p', { style: { margin: 0 } }, p.message), p.children);
  }
  function ModalStack(p) {
    var kids = R.Children.toArray(p.children);
    return h('div', { className: 'w-stack', style: { height: p.height || 560 } }, p.behind,
      kids.map(function (k, i) { return h('div', { key: i, className: 'w-stack-layer' }, h('div', { className: 'w-scrim' }), h('div', { style: { position: 'relative', transform: 'translateY(' + (i * 20 - (kids.length - 1) * 10) + 'px)' } }, k)); }));
  }

  /* ---------- page parts ---------- */
  function Card(p) {
    return h('section', { className: cx('w-card', p.className), style: p.style },
      (p.title || p.actions) && h('div', { className: 'w-card-head' }, h('h3', null, p.icon && h(Icon, { name: p.icon }), p.title), p.actions && h('div', { className: 'w-row' }, p.actions)),
      h('div', { className: p.flush ? null : 'w-card-body', style: p.bodyStyle }, p.children));
  }
  function PageHeader(p) {
    return h('div', { className: 'w-pagehead' }, p.back && h(Button, { variant: 'ghost', size: 'sm', iconOnly: true, icon: 'collapse', label: 'Back' }),
      h('div', { style: { flex: 1, minWidth: 0 } }, h('h1', { className: 'w-row', style: { gap: 10 } }, p.title, p.badges), p.subtitle && h('p', null, p.subtitle)),
      p.actions && h('div', { className: 'w-row' }, p.actions));
  }
  function StatCard(p) {
    return h('div', { className: cx('w-stat', p.tone === 'key' && 'is-key') },
      h('div', { className: 'w-stat-top' }, h('span', { className: 'w-stat-label' }, p.label), p.icon && h('span', { className: 'w-stat-ico' }, h(Icon, { name: p.icon, size: 16 }))),
      h('span', { className: 'w-stat-value', style: p.negative ? { color: 'var(--color-destructive)' } : null }, p.value),
      p.sub && h('span', { className: 'w-stat-sub', style: p.subTone ? { color: 'var(--color-' + p.subTone + ')' } : null }, p.sub));
  }
  function EmptyState(p) {
    return h('div', { className: 'w-empty' }, h('span', { className: 'w-empty-ico' }, h(Icon, { name: p.icon || 'inbox', size: 22 })), h('b', null, p.title), p.text && h('span', null, p.text));
  }
  function Table(p) {
    return h('table', { className: 'w-table' },
      p.columns.every(function (c) { return !c.label; }) ? null : h('thead', null, h('tr', null, p.columns.map(function (c, i) { return h('th', { key: i, className: c.end ? 'w-end' : null, style: c.width ? { width: c.width } : null }, c.label); }))),
      h('tbody', null, p.rows.length ? p.rows.map(function (r, i) { return h('tr', { key: i, className: cx(p.selected === i && 'is-selected', p.clickable && 'is-click') }, p.columns.map(function (c, j) { return h('td', { key: j, className: c.end ? 'w-end' : null }, r[j]); })); })
        : h('tr', null, h('td', { colSpan: p.columns.length }, p.empty))));
  }

  /* ---------- components/DevicePicker ---------- */
  function DevicePicker(p) {
    var lang = p.lang || 'en';
    var manual = !!p.manual;
    var links = h('div', { className: 'w-dp-links' }, p.picked && h('a', { href: '#' }, h(Icon, { name: 'info', size: 14 }), t(lang, 'details')), h('a', { href: '#' }, h(Icon, { name: manual ? 'list' : 'edit', size: 14 }), manual ? t(lang, 'fromList') : t(lang, 'manual')));
    return h('div', { className: 'w-dp' },
      h('div', { className: 'w-dp-top' }, h(SegmentedSwitch, { value: p.category || 'phone', options: [{ value: 'phone', label: t(lang, 'phone'), icon: 'phone' }, { value: 'laptop', label: t(lang, 'laptop'), icon: 'laptop' }, { value: 'console', label: t(lang, 'console'), icon: 'gamepad' }] }), links),
      manual ? h('div', { className: 'w-grid2' }, h(Input, { label: t(lang, 'brandL'), value: p.brand, placeholder: 'e.g. Samsung' }), h(Input, { label: t(lang, 'modelL'), value: p.model, placeholder: 'e.g. Galaxy A54' }))
        : h('div', { className: 'w-grid2' },
          h(Field, { label: t(lang, 'brandL') }, h(Combobox, { value: p.brand, placeholder: t(lang, 'brand'), open: p.openList === 'brand', items: p.brandItems })),
          h(Field, { label: t(lang, 'modelL') }, h(Combobox, { value: p.model, placeholder: p.brand ? t(lang, 'model') : t(lang, 'allModels'), open: p.openList === 'model', query: p.query, items: p.modelItems }))));
  }

  /* ---------- pages/sales/POS.jsx payment box ---------- */
  function PosPayment(p) {
    var lang = p.lang || 'en', total = p.total || 0, paid = p.paid, method = p.method || 'cash';
    var owed = method === 'credit' ? total : Math.max(0, total - (paid || 0));
    function line(k, v, big) { return h('div', { className: cx('w-totline', big && 'is-big') }, h('span', null, k), h('span', null, v)); }
    var amt = function (v) { return lang === 'ar' ? '\u2067\u2066' + fmt(v) + '\u2069 ' + t(lang, 'currency') + '\u2069' : '\u2066' + fmt(v) + ' ' + t(lang, 'currency') + '\u2069'; };
    var rx = function (s, a, n) { return s.replace('%s', a).replace('%a', a).replace('%n', n || ''); };
    return h('div', { className: 'w-col', style: { gap: 12 } },
      h(Card, { title: t(lang, 'total') }, h('div', { className: 'w-col', style: { gap: 8 } },
        line(t(lang, 'subtotal'), h(Money, { value: p.subtotal || total, lang: lang })),
        h('div', { className: 'w-totline' }, h('span', null, t(lang, 'discount')), h('input', { className: 'w-input w-input-sm', defaultValue: p.discount || 0 })),
        h('div', { className: 'w-totline' }, h('span', null, t(lang, 'tradeCredit')), h('input', { className: 'w-input w-input-sm', defaultValue: p.tradeIn || 0 })),
        line(t(lang, 'total'), h(Money, { value: total, lang: lang }), true))),
      h(Card, { title: t(lang, 'payMethod') }, h('div', { className: 'w-col', style: { gap: 10 } },
        h(SegmentedSwitch, { block: true, vertical: true, value: method, options: [{ value: 'cash', label: t(lang, 'cash') }, { value: 'credit', label: t(lang, 'creditFull') }, { value: 'split', label: t(lang, 'split') }] }),
        method !== 'credit' && h(MoneyInput, { label: t(lang, 'amountPaid'), value: paid, placeholder: total, lang: lang }),
        method === 'cash' && paid > total && h('div', { className: 'w-line w-line-success' }, t(lang, 'change') + ': ', h(Money, { value: paid - total, lang: lang })),
        method === 'cash' && paid != null && paid < total && h('div', { className: 'w-alert w-alert-warning w-alert-col' }, h('div', { className: 'w-row', style: { fontWeight: 600 } }, h(Icon, { name: 'alert' }), rx(t(lang, 'missing'), amt(total - paid))), h(Button, { size: 'sm', variant: 'outline', icon: 'wallet' }, t(lang, 'restDebt'))),
        method !== 'cash' && owed > 0 && (p.customer ? h('div', { className: 'w-line w-line-info' }, h(Icon, { name: 'info', size: 16 }), rx(t(lang, 'willAdd'), amt(owed), p.customer))
          : h('div', { className: 'w-line w-line-danger' }, h(Icon, { name: 'alert', size: 16 }), rx(t(lang, 'willOwe'), amt(owed)))))),
      h(Button, { variant: 'flux', size: 'lg', block: true, icon: 'check' }, t(lang, 'completeSale')));
  }

  /* ---------- PaymentHistoryModal table ---------- */
  function PaymentHistory(p) {
    var lang = p.lang || 'en';
    return h(Table, { columns: [{ label: t(lang, 'date') }, { label: t(lang, 'amount'), end: true }, { label: t(lang, 'note') }, { label: '' }], rows: p.payments.map(function (x) {
      var amt = x.cancelling ? h('span', { style: { color: 'var(--color-destructive)' } }, h(Money, { value: -Math.abs(x.amount), lang: lang })) : x.cancelled ? h('span', { className: 'w-strike w-muted' }, h(Money, { value: x.amount, lang: lang })) : h(Money, { value: x.amount, lang: lang });
      return [h('span', { className: 'w-num' }, x.date), amt, h('span', { className: 'w-row', style: { gap: 6 } }, x.cancelling && h(StatusBadge, { kind: 'payment', value: 'cancelling-entry', lang: lang }), x.cancelled && h(StatusBadge, { kind: 'payment', value: 'cancelled', lang: lang }), x.note),
        (!x.cancelling && !x.cancelled) ? h('span', { className: 'w-row', style: { gap: 4, justifyContent: 'flex-end' } }, p.receipts !== false && h(Button, { size: 'sm', variant: 'ghost', icon: 'print' }, t(lang, 'receipt')), p.owner && h(Button, { size: 'sm', variant: 'ghost', icon: 'undo', className: 'w-btn-dangertext' }, t(lang, 'cancelPay'))) : ''];
    }) });
  }

  /* ---------- layout/Sidebar + Header (groups, items and labels as in the app) ---------- */
  var NAV = [
    ['main', ['Main', 'Principal', 'الرئيسية'], [['dashboard', 'home', ['Dashboard', 'Tableau de bord', 'لوحة القيادة']], ['customers', 'users', ['Customers', 'Clients', 'الزبائن']], ['inventory', 'box', ['Inventory', 'Inventaire', 'المخزون']], ['devices', 'devices', ['Devices', 'Appareils', 'الأجهزة']]]],
    ['repairs', ['Repairs', 'Réparations', 'الصيانة'], [['checkin', 'inbox', ['Check-In', 'Réception', 'إستلام']], ['tickets', 'wrench', ['Tickets', 'Réparations', 'تصليحات']], ['warranty', 'shield', ['Warranty', 'Garantie', 'الضمان']], ['tradeins', 'swap', ['Trade-Ins', 'Reprises', 'شراء هواتف']]]],
    ['sales', ['Sales', 'Ventes', 'المبيعات'], [['pos', 'cart', ['POS', 'Caisse (POS)', 'نقطة البيع']], ['invoices', 'file', ['Invoices', 'Factures', 'الفواتير']]]],
    ['finance', ['Finance', 'Finance', 'المالية'], [['expenses', 'cash', ['Expenses', 'Dépenses', 'المصاريف']], ['suppliers', 'truck', ['Suppliers', 'Fournisseurs', 'الموردين'], 1], ['debts', 'wallet', ['Debt Ledger', 'Créances', 'الديون']], ['close', 'receipt', ['Daily Close', 'Clôture Journalière', 'الغلق اليومي']], ['monthly', 'chart', ['Monthly Summary', 'Résumé Mensuel', 'الملخص الشهري'], 1]]],
    ['settings', ['Settings', 'Paramètres', 'الإعدادات'], [['store', 'store', ['Store', 'Boutique', 'المحل'], 1], ['users', 'user', ['Users', 'Utilisateurs', 'المستخدمين'], 1], ['backup', 'download', ['Backup', 'Sauvegarde', 'النسخ الاحتياطي'], 1], ['catalog', 'cpu', ['Device Catalog', "Catalogue d'appareils", 'دليل الأجهزة'], 1], ['about', 'info', ['About App', 'About App', 'About App']]]]
  ];
  function Sidebar(p) {
    var lang = p.lang || 'en', seller = p.role === 'staff', col = p.collapsed;
    return h('aside', { className: cx('w-side', col && 'is-collapsed') },
      h('div', { className: 'w-side-band' }, p.logo && h('img', { src: p.logo, alt: '' }), !col && h('div', null, h('b', null, 'WARSHATI ', h('span', { className: 'w-side-ar' }, 'ورشتي')), h('span', null, 'Shop Manager'))),
      h('nav', { className: 'w-side-nav' }, NAV.map(function (g) {
        var items = g[2].filter(function (it) { return !(seller && it[3]); });
        return h(F, { key: g[0] }, !col && h('div', { className: 'w-side-sec' }, pick(lang, g[1][0], g[1][1], g[1][2])),
          items.map(function (it) { return h('button', { key: it[0], className: cx('w-nav', p.active === it[0] && 'is-active'), title: col ? pick(lang, it[2][0], it[2][1], it[2][2]) : null }, h(Icon, { name: it[1] }), !col && pick(lang, it[2][0], it[2][1], it[2][2])); }));
      })),
      h('div', { className: 'w-side-foot' }, h('button', { className: 'w-nav' }, h(Icon, { name: 'message' }), !col && 'Send Feedback'), h('button', { className: 'w-nav', 'aria-label': 'Collapse' }, h(Icon, { name: 'collapse' }))));
  }
  function Header(p) {
    var crumbs = p.crumbs || [];
    return h('header', { className: 'w-head' },
      h('div', { className: 'w-crumbs' }, h(Icon, { name: 'home', size: 16 }), crumbs.map(function (c, i) { return h(F, { key: i }, h(Icon, { name: 'chev-end', size: 14 }), h('span', { className: i === crumbs.length - 1 ? 'is-last' : null }, c)); })),
      h('div', { className: 'w-row', style: { gap: 6 } },
        p.update && h('button', { className: 'w-update' }, h(Icon, { name: 'refresh', size: 14 }), p.update),
        h(Button, { variant: 'ghost', size: 'sm', iconOnly: true, icon: 'bell', label: 'Notifications' }),
        h('button', { className: 'w-userbtn' }, h('span', { className: 'w-avatar' }, (p.user || 'K')[0]), p.user || 'Karim', h(Icon, { name: 'chev-down', size: 14 }))));
  }
  function AppShell(p) {
    var lang = p.lang || 'en';
    return h('div', { className: 'w-root w-shell', dir: DICT[lang].dir, lang: lang },
      h(Sidebar, { lang: lang, role: p.role, active: p.active, logo: p.logo, collapsed: p.collapsed }),
      h('div', { className: 'w-shell-main' }, h(Header, { crumbs: p.crumbs, user: p.user, update: p.update }), h('main', { className: 'w-page', style: p.pageStyle }, p.children)),
      p.toast && h('div', { className: 'w-toasts' }, p.toast),
      p.overlay && h('div', { className: 'w-stack-layer' }, h('div', { className: 'w-scrim' }), h('div', { style: { position: 'relative' } }, p.overlay)));
  }

  /* ---------- print ---------- */
  function Receipt(p) { return h('div', { className: cx('w-paper', 'w-paper-' + (p.paper || 80)), dir: p.lang === 'ar' ? 'rtl' : 'ltr', lang: p.lang }, p.children); }
  function A4Report(p) { return h('div', { className: 'w-a4', dir: p.lang === 'ar' ? 'rtl' : 'ltr' }, p.children); }


  /* ================= Warshati Admin (owner portal, warshatydz.com/dashboard) ================= */
  function Initials(p) {
    var n = (p.name || '?').split(/\s+/).map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase();
    return h('span', { className: 'w-avatar', style: p.size ? { width: p.size, height: p.size, fontSize: Math.round(p.size * 0.38) } : null }, n);
  }
  function KeyField(p) {
    return h('span', { className: cx('a-key', p.dashed && 'is-dashed', p.revoked && 'is-revoked') }, h('span', { className: 'w-code' }, p.value), h(Button, { variant: 'ghost', size: 'sm', iconOnly: true, icon: 'copy', label: 'Copy' }));
  }
  function FilterChips(p) {
    var s = R.useState(p.value || p.items[0].value), v = s[0], set = s[1];
    return h('div', { className: 'a-chips', role: 'group' }, p.items.map(function (it) {
      return h('button', { key: it.value, type: 'button', className: 'a-chip', 'aria-pressed': String(it.value === v), onClick: function () { set(it.value); } }, it.label, it.count != null && h('span', { className: 'a-chip-n' }, it.count));
    }));
  }
  function ActivityFeed(p) {
    return h('div', { className: 'a-feed' }, p.items.map(function (it, i) {
      return h('div', { key: i, className: 'a-feed-row' }, h('span', { className: 'a-feed-ico', style: { background: 'var(--color-tone-' + (it.tone || 'gray') + '-bg)', color: 'var(--color-tone-' + (it.tone || 'gray') + '-fg)' } }, h(Icon, { name: it.icon, size: 16 })), h('span', { className: 'a-feed-text' }, it.text), h('span', { className: 'w-sub' }, it.time));
    }));
  }
  function BarList(p) {
    var max = p.max || Math.max.apply(null, p.items.map(function (x) { return x.value; }));
    return h('div', { className: 'a-bars' }, p.items.map(function (it, i) {
      return h('div', { key: i, className: 'a-bar-row' }, h('span', { className: 'a-bar-label' }, it.label), h('span', { className: 'a-bar-track' }, h('i', { style: { width: (it.value / max * 100) + '%' } })), h('span', { className: 'a-bar-val w-num' }, it.display || it.value));
    }));
  }
  function Skeleton(p) { return h('span', { className: 'a-skel', style: { width: p.w || '100%', height: p.h || 14, borderRadius: p.r || 6 } }); }
  function Stepper(p) {
    return h('div', { className: 'a-stepper' }, h(Button, { variant: 'outline', size: 'sm', iconOnly: true, icon: 'minus', label: 'Less' }), h('span', { className: 'w-num' }, p.value || 1), h(Button, { variant: 'outline', size: 'sm', iconOnly: true, icon: 'plus', label: 'More' }));
  }
  var ANAV = [['overview', 'home', 'Overview'], ['licenses', 'key', 'Licenses'], ['feedback', 'message', 'Feedback', 'feedback'], ['crashes', 'bug', 'Crashes', 'crashes']];
  function AdminSidebar(p) {
    var counts = p.counts || {};
    return h('aside', { className: 'a-side' },
      h('div', { className: 'a-brand' }, p.logo && h('img', { src: p.logo, alt: '' }), h('div', null, h('b', null, 'Warshati ', h('span', { className: 'w-side-ar' }, 'ورشتي')), h('span', null, 'Admin'))),
      h('div', { style: { padding: '4px 12px 12px' } }, h(Button, { variant: 'flux', block: true, icon: 'plus' }, 'New license')),
      h('nav', { className: 'a-nav' }, ANAV.map(function (n) { return h('button', { key: n[0], className: cx('a-nav-item', p.active === n[0] && 'is-active') }, h(Icon, { name: n[1] }), n[2], n[3] && counts[n[3]] ? h('span', { className: 'a-count' }, counts[n[3]]) : null); })),
      h('div', { className: 'a-side-foot' }, [['book', 'User guide'], ['globe', 'Website'], [p.dark ? 'sun' : 'moon', p.dark ? 'Light mode' : 'Dark mode'], ['logout', 'Sign out']].map(function (x) { return h('button', { key: x[1], className: 'a-nav-item' }, h(Icon, { name: x[0] }), x[1]); })));
  }
  function AdminShell(p) {
    if (p.mobile) {
      return h('div', { className: 'w-root a-shell a-mobile', style: { width: p.width || 390, height: p.height || 844 } },
        h('header', { className: 'a-topbar' }, h(Button, { variant: 'ghost', size: 'sm', iconOnly: true, icon: 'menu', label: 'Menu', className: 'a-on-inverse' }), p.logo && h('img', { src: p.logo, alt: '', width: 26 }), h('b', null, 'Warshati ', h('span', { className: 'w-side-ar' }, 'ورشتي'), ' · Admin')),
        h('main', { className: 'a-page' }, p.children),
        p.menuOpen && h('div', { className: 'w-stack-layer', style: { placeItems: 'stretch', justifyItems: 'start' } }, h('div', { className: 'w-scrim' }), h('div', { style: { position: 'relative', height: '100%' } }, h(AdminSidebar, p))),
        p.toast && h('div', { className: 'w-toasts', style: { insetInlineEnd: 12, bottom: 12 } }, p.toast),
        p.overlay && h('div', { className: 'w-stack-layer' }, h('div', { className: 'w-scrim' }), h('div', { style: { position: 'relative', padding: 12 } }, p.overlay)));
    }
    return h('div', { className: 'w-root a-shell', style: { width: p.width || 1366, height: p.height || 768 } },
      h(AdminSidebar, p),
      h('main', { className: 'a-page' }, p.children),
      p.toast && h('div', { className: 'w-toasts' }, p.toast),
      p.overlay && h('div', { className: 'w-stack-layer' }, h('div', { className: 'w-scrim' }), h('div', { style: { position: 'relative' } }, p.overlay)));
  }
  window.Warshati = Object.assign(window.Warshati || {}, {
    Icon: Icon, Button: Button, Input: Input, Field: Field, Select: Select, Checkbox: Checkbox, MoneyInput: MoneyInput, Combobox: Combobox, SegmentedSwitch: SegmentedSwitch, Tabs: Tabs,
    Badge: Badge, StatusBadge: StatusBadge, VfmBadge: VfmBadge, Money: Money, Alert: Alert, Toast: Toast, Modal: Modal, ConfirmModal: ConfirmModal, ModalStack: ModalStack,
    Card: Card, PageHeader: PageHeader, StatCard: StatCard, Table: Table, EmptyState: EmptyState, DevicePicker: DevicePicker, PosPayment: PosPayment, PaymentHistory: PaymentHistory,
    WhatsAppButton: WhatsAppButton, Initials: Initials, KeyField: KeyField, FilterChips: FilterChips, ActivityFeed: ActivityFeed, BarList: BarList, Skeleton: Skeleton, Stepper: Stepper, AdminSidebar: AdminSidebar, AdminShell: AdminShell, Sidebar: Sidebar, Header: Header, AppShell: AppShell, Receipt: Receipt, A4Report: A4Report,
    i18n: DICT, t: t, STATUS: STATUS, formatAmount: fmt, iconNames: Object.keys(P), NAV: NAV
  });
})();
