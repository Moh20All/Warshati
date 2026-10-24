; Warshati installer: welcome and finish pages in our words (EN / FR / AR).
; The side picture (assets/installer/sidebar.bmp) shows on both pages.
; The installer picks the language from Windows (French, Arabic, otherwise English).

!macro customHeader
  LangString wWelcomeTitle ${LANG_ENGLISH} "Welcome to Warshati"
  LangString wWelcomeTitle ${LANG_FRENCH} "Bienvenue dans Warshati"
  LangString wWelcomeTitle ${LANG_ARABIC} "مرحبًا بك في ورشتي"

  LangString wWelcomeText ${LANG_ENGLISH} "Warshati runs your phone repair shop: repairs, sales, stock, debts and the daily close, all on this computer, without internet.$\r$\n$\r$\nYour data stays here when you update or reinstall.$\r$\n$\r$\nClick Next to continue."
  LangString wWelcomeText ${LANG_FRENCH} "Warshati gère votre atelier de réparation : réparations, ventes, stock, dettes et clôture de caisse, sur cet ordinateur, sans internet.$\r$\n$\r$\nVos données sont conservées lors d'une mise à jour ou d'une réinstallation.$\r$\n$\r$\nCliquez sur Suivant pour continuer."
  LangString wWelcomeText ${LANG_ARABIC} "ورشتي يسيّر محل تصليح الهواتف: الإصلاحات، المبيعات، المخزون، الديون وإغلاق اليوم، كل ذلك على هذا الحاسوب ودون إنترنت.$\r$\n$\r$\nتبقى بياناتك محفوظة عند التحديث أو إعادة التثبيت.$\r$\n$\r$\nاضغط على التالي للمتابعة."

  LangString wFinishTitle ${LANG_ENGLISH} "Warshati is ready"
  LangString wFinishTitle ${LANG_FRENCH} "Warshati est prêt"
  LangString wFinishTitle ${LANG_ARABIC} "ورشتي جاهز"

  LangString wFinishText ${LANG_ENGLISH} "Warshati is installed. You will find it on your desktop and in the Start menu.$\r$\n$\r$\nNeed help? warshatydz.com"
  LangString wFinishText ${LANG_FRENCH} "Warshati est installé. Vous le trouverez sur le bureau et dans le menu Démarrer.$\r$\n$\r$\nBesoin d'aide ? warshatydz.com"
  LangString wFinishText ${LANG_ARABIC} "تم تثبيت ورشتي. ستجده على سطح المكتب وفي قائمة ابدأ.$\r$\n$\r$\nتحتاج مساعدة؟ warshatydz.com"

  LangString wFinishRun ${LANG_ENGLISH} "Start Warshati now"
  LangString wFinishRun ${LANG_FRENCH} "Lancer Warshati maintenant"
  LangString wFinishRun ${LANG_ARABIC} "تشغيل ورشتي الآن"
!macroend

!macro customWelcomePage
  !insertmacro skipPageIfUpdated
  !define MUI_WELCOMEPAGE_TITLE "$(wWelcomeTitle)"
  !define MUI_WELCOMEPAGE_TEXT "$(wWelcomeText)"
  !insertmacro MUI_PAGE_WELCOME
!macroend

; Same as electron-builder's finish page (start the app as the normal user), with our text
!macro customFinishPage
  Function StartApp
    ${if} ${isUpdated}
      StrCpy $1 "--updated"
    ${else}
      StrCpy $1 ""
    ${endif}
    ${StdUtils.ExecShellAsUser} $0 "$launchLink" "open" "$1"
  FunctionEnd

  !define MUI_FINISHPAGE_TITLE "$(wFinishTitle)"
  !define MUI_FINISHPAGE_TEXT "$(wFinishText)"
  !define MUI_FINISHPAGE_RUN
  !define MUI_FINISHPAGE_RUN_TEXT "$(wFinishRun)"
  !define MUI_FINISHPAGE_RUN_FUNCTION "StartApp"
  !insertmacro MUI_PAGE_FINISH
!macroend
