// Ready-made phrases for repair tickets, most common first. The ticket fields still accept any text;
// these are offered in a list under the field (see components/ui/SuggestTextarea.jsx).
// Each entry: [English, French, Arabic].

const ISSUES = [
  ['Broken screen', 'Écran cassé', 'شاشة مكسورة'],
  ['Not charging', 'Ne charge pas', 'لا يشحن'],
  ['Battery drains fast', 'Batterie se vide vite', 'البطارية تفرغ بسرعة'],
  ['Does not turn on', 'Ne s\'allume pas', 'لا يشتغل'],
  ['Touch not working', 'Tactile ne répond pas', 'اللمس لا يعمل'],
  ['No display (black screen)', 'Pas d\'affichage (écran noir)', 'لا توجد صورة (شاشة سوداء)'],
  ['Lines or spots on the screen', 'Lignes ou taches sur l\'écran', 'خطوط أو بقع على الشاشة'],
  ['Water damage', 'Tombé dans l\'eau', 'سقط في الماء'],
  ['Dropped', 'Tombé par terre', 'سقط على الأرض'],
  ['Charging port loose or damaged', 'Connecteur de charge abîmé', 'منفذ الشحن تالف'],
  ['Restarts by itself', 'Redémarre tout seul', 'يعيد التشغيل وحده'],
  ['Stuck on the logo', 'Bloqué sur le logo', 'عالق على الشعار'],
  ['Forgotten password or pattern', 'Mot de passe ou schéma oublié', 'نسي كلمة السر أو النمط'],
  ['Google account locked (FRP)', 'Compte Google bloqué (FRP)', 'حساب Google مقفل (FRP)'],
  ['iCloud locked', 'Bloqué iCloud', 'مقفل بحساب iCloud'],
  ['Software update or flashing', 'Mise à jour ou flashage', 'تحديث أو تفليش النظام'],
  ['Slow, freezes', 'Lent, se bloque', 'بطيء ويتجمد'],
  ['Overheating', 'Chauffe beaucoup', 'يسخن كثيراً'],
  ['Swollen battery', 'Batterie gonflée', 'بطارية منتفخة'],
  ['No network', 'Pas de réseau', 'لا توجد شبكة'],
  ['SIM card not detected', 'Carte SIM non détectée', 'لا يتعرف على الشريحة'],
  ['No sound', 'Pas de son', 'لا يوجد صوت'],
  ['Cannot hear during calls', 'N\'entend pas pendant les appels', 'لا يسمع أثناء المكالمات'],
  ['Others cannot hear me (microphone)', 'On ne m\'entend pas (micro)', 'الطرف الآخر لا يسمعني (الميكروفون)'],
  ['Loudspeaker crackles', 'Haut-parleur grésille', 'مكبر الصوت يصدر تشويشاً'],
  ['Camera not working', 'Caméra ne marche pas', 'الكاميرا لا تعمل'],
  ['Blurry camera', 'Caméra floue', 'الكاميرا غير واضحة'],
  ['Broken camera glass', 'Vitre de caméra cassée', 'زجاج الكاميرا مكسور'],
  ['Broken back glass', 'Vitre arrière cassée', 'الزجاج الخلفي مكسور'],
  ['Power button not working', 'Bouton power ne marche pas', 'زر التشغيل لا يعمل'],
  ['Volume buttons not working', 'Boutons de volume ne marchent pas', 'أزرار الصوت لا تعمل'],
  ['Face ID or fingerprint not working', 'Face ID ou empreinte ne marche pas', 'بصمة الوجه أو الإصبع لا تعمل'],
  ['Ghost touch (screen presses by itself)', 'L\'écran appuie tout seul', 'الشاشة تضغط وحدها'],
  ['Wi-Fi not working', 'Wi-Fi ne marche pas', 'الواي فاي لا يعمل'],
  ['Bluetooth not working', 'Bluetooth ne marche pas', 'البلوتوث لا يعمل'],
  ['Vibration not working', 'Vibreur ne marche pas', 'الاهتزاز لا يعمل'],
  ['Headphone jack not working', 'Prise casque ne marche pas', 'منفذ السماعات لا يعمل'],
  ['Storage full', 'Mémoire pleine', 'الذاكرة ممتلئة'],
  ['Data transfer or backup', 'Transfert ou sauvegarde des données', 'نقل البيانات أو حفظها'],
  ['Network unlock', 'Déblocage réseau', 'فك قفل الشبكة']
]

const DIAGNOSES = [
  ['Screen damaged, needs replacing', 'Écran endommagé, à remplacer', 'الشاشة تالفة، تحتاج تبديل'],
  ['Touch glass broken, display works', 'Vitre tactile cassée, l\'affichage marche', 'زجاج اللمس مكسور والعرض سليم'],
  ['Battery worn out', 'Batterie usée', 'البطارية مستهلكة'],
  ['Battery swollen, needs replacing', 'Batterie gonflée, à remplacer', 'البطارية منتفخة، تحتاج تبديل'],
  ['Charging port dirty, cleaned', 'Connecteur de charge sale, nettoyé', 'منفذ الشحن متسخ، تم تنظيفه'],
  ['Charging port damaged, needs replacing', 'Connecteur de charge HS, à remplacer', 'منفذ الشحن تالف، يحتاج تبديل'],
  ['Software problem, needs flashing', 'Problème logiciel, à flasher', 'مشكل في النظام، يحتاج تفليش'],
  ['Corrosion from liquid', 'Oxydation (liquide)', 'أكسدة بسبب السوائل'],
  ['Short circuit on the motherboard', 'Court-circuit sur la carte mère', 'تماس كهربائي في اللوحة الأم'],
  ['Display flex cable damaged', 'Nappe d\'écran endommagée', 'فلات الشاشة تالف'],
  ['Charging IC faulty', 'Circuit de charge (IC) défectueux', 'دارة الشحن (IC) معطلة'],
  ['Power IC faulty', 'Circuit d\'alimentation (IC) défectueux', 'دارة الطاقة (IC) معطلة'],
  ['Motherboard faulty', 'Carte mère défectueuse', 'اللوحة الأم معطلة'],
  ['Earpiece faulty', 'Écouteur interne défectueux', 'سماعة المكالمات معطلة'],
  ['Loudspeaker faulty', 'Haut-parleur défectueux', 'مكبر الصوت معطل'],
  ['Microphone faulty', 'Micro défectueux', 'الميكروفون معطل'],
  ['Rear camera faulty', 'Caméra arrière défectueuse', 'الكاميرا الخلفية معطلة'],
  ['Front camera faulty', 'Caméra avant défectueuse', 'الكاميرا الأمامية معطلة'],
  ['Antenna or network problem', 'Problème d\'antenne ou de réseau', 'مشكل في الهوائي أو الشبكة'],
  ['SIM reader faulty', 'Lecteur SIM défectueux', 'قارئ الشريحة معطل'],
  ['Power button flex damaged', 'Nappe du bouton power endommagée', 'فلات زر التشغيل تالف'],
  ['Volume flex damaged', 'Nappe de volume endommagée', 'فلات أزرار الصوت تالف'],
  ['Face ID or fingerprint sensor faulty', 'Capteur Face ID ou empreinte défectueux', 'مستشعر بصمة الوجه أو الإصبع معطل'],
  ['Back glass broken', 'Vitre arrière cassée', 'الزجاج الخلفي مكسور'],
  ['Frame bent', 'Châssis tordu', 'الإطار ملتوٍ'],
  ['Account lock removed', 'Blocage du compte retiré', 'تمت إزالة قفل الحساب'],
  ['Software reinstalled', 'Logiciel réinstallé', 'تمت إعادة تثبيت النظام'],
  ['Opened before by another repairer', 'Déjà ouvert par un autre réparateur', 'فُتح سابقاً عند مصلح آخر'],
  ['Waiting for the customer to accept the price', 'En attente de l\'accord du client sur le prix', 'في انتظار موافقة الزبون على السعر'],
  ['No fault found', 'Aucune panne trouvée', 'لم يتم العثور على عطل'],
  ['Not repairable', 'Non réparable', 'غير قابل للإصلاح']
]

const PARTS = [
  ['Screen (LCD)', 'Écran LCD', 'شاشة LCD'],
  ['Screen (OLED, original)', 'Écran OLED (original)', 'شاشة OLED (أصلية)'],
  ['Battery', 'Batterie', 'بطارية'],
  ['Charging port', 'Connecteur de charge', 'منفذ الشحن'],
  ['Charging board', 'Carte de charge', 'لوحة الشحن'],
  ['Touch glass', 'Vitre tactile', 'زجاج اللمس'],
  ['Back glass', 'Vitre arrière', 'الغطاء الخلفي'],
  ['Camera glass', 'Vitre de caméra', 'زجاج الكاميرا'],
  ['Screen protector', 'Verre trempé', 'واقي الشاشة'],
  ['Rear camera', 'Caméra arrière', 'الكاميرا الخلفية'],
  ['Front camera', 'Caméra avant', 'الكاميرا الأمامية'],
  ['Earpiece', 'Écouteur interne', 'سماعة المكالمات'],
  ['Loudspeaker', 'Haut-parleur', 'مكبر الصوت'],
  ['Microphone', 'Micro', 'ميكروفون'],
  ['Power button flex', 'Nappe power', 'فلات زر التشغيل'],
  ['Volume flex', 'Nappe volume', 'فلات أزرار الصوت'],
  ['Main flex cable', 'Nappe principale', 'الفلات الرئيسي'],
  ['SIM tray', 'Tiroir SIM', 'درج الشريحة'],
  ['Vibration motor', 'Vibreur', 'محرك الاهتزاز'],
  ['Charging IC', 'IC de charge', 'دارة الشحن IC'],
  ['Power IC', 'IC d\'alimentation', 'دارة الطاقة IC'],
  ['Frame', 'Châssis', 'الإطار'],
  ['Waterproof adhesive', 'Adhésif d\'étanchéité', 'لاصق العزل'],
  ['Screws', 'Vis', 'براغي'],
  ['Software only, no part', 'Logiciel uniquement, aucune pièce', 'برمجة فقط، بدون قطع']
]

const COLUMN = { en: 0, fr: 1, ar: 2 }

/** The phrases of one field in a language: { label, keywords } (the English text helps searching in every language) */
export function repairPhrases(field, lang) {
  const list = field === 'issue' ? ISSUES : field === 'diagnosis' ? DIAGNOSES : PARTS
  const col = COLUMN[String(lang || 'en').slice(0, 2)] ?? 0
  return list.map((row) => ({ label: row[col], keywords: row[0] }))
}
