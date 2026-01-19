// INFER - 4-Video Experiment Version
// STUDY VERSION: Gamma (Control Group)
// - All videos: Simple feedback (8-9 sentences, no complex INFER analysis)
// - All surveys mandatory
// - NO tutorial video (unlike Alpha)
//
// DATA COLLECTION:
// - All user interactions (clicks, navigations) logged to Supabase
// - Reflection data and feedback stored in Supabase
// - Progress tracking in participant_progress table

// ============================================================================
// STUDY CONDITION - DO NOT MODIFY
// ============================================================================
const STUDY_CONDITION = 'control';
const STUDY_VERSION = 'gamma';
// ============================================================================

// Constants and configuration
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
const CORS_PROXY_URL = isProduction 
    ? 'https://tubingen-feedback-cors-proxy.onrender.com'
    : 'http://localhost:3000';
const OPENAI_API_URL = `${CORS_PROXY_URL}/api/openai/v1/chat/completions`;
const model = 'gpt-4o';

// ============================================================================
// Supabase Configuration - UPDATE THESE FOR NEW DATABASE
// ============================================================================
const SUPABASE_URL = 'https://cvmzsljalmkrehfkqjtc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2bXpzbGphbG1rcmVoZmtxanRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1OTM5MzIsImV4cCI6MjA3OTE2OTkzMn0.0IxG1T574aCCH6pxfn8tgGrzw3XUuDKFPE8YQQkV9T4';
// ============================================================================

// Video Configuration - UPDATE WITH YOUR 4 VIDEOS
// Control Group (Gamma): Videos 2 & 3 have simple feedback, Videos 1 & 4 are reflection-only (no feedback)
const VIDEOS = [
    { id: 'video1', name: 'Video 1: [Name]', link: 'VIDEO_LINK_1', password: 'PASSWORD_1', hasINFER: false },
    { id: 'video2', name: 'Video 2: [Name]', link: 'VIDEO_LINK_2', password: 'PASSWORD_2', hasINFER: true },
    { id: 'video3', name: 'Video 3: [Name]', link: 'VIDEO_LINK_3', password: 'PASSWORD_3', hasINFER: true },
    { id: 'video4', name: 'Video 4: [Name]', link: 'VIDEO_LINK_4', password: 'PASSWORD_4', hasINFER: false }
];

// Tutorial Video Configuration - NOT USED IN GAMMA (Control Group has no tutorial)
// const TUTORIAL_VIDEO = {
//     link: 'tutorial_german.mp4',
//     password: ''
// };

// Qualtrics Survey Links
const QUALTRICS_SURVEYS = {
    pre: 'https://unc.az1.qualtrics.com/jfe/form/SV_9XLC3Bd1eQfu2p0',
    post_video_1: 'https://unc.az1.qualtrics.com/jfe/form/SV_aWTs9RvswqAWyVg',
    post_video_2: 'https://unc.az1.qualtrics.com/jfe/form/SV_aWTs9RvswqAWyVg',
    post_video_3: 'https://unc.az1.qualtrics.com/jfe/form/SV_aWTs9RvswqAWyVg',
    post_video_4: 'https://unc.az1.qualtrics.com/jfe/form/SV_aWTs9RvswqAWyVg',
    post: 'https://unc.az1.qualtrics.com/jfe/form/SV_eretEVKsvHFFBXg'
};

// Global state
let currentPage = 'login';
let currentLanguage = 'de'; // Default to German
let userPreferredFeedbackStyle = 'extended';
let currentSessionId = null;
let supabase = null;
let currentParticipant = null;
let currentParticipantProgress = null;
let currentVideoId = null;
let currentTaskState = {
    feedbackGenerated: false,
    submitted: false,
    currentReflectionId: null,
    parentReflectionId: null,
    revisionCount: 0,
    currentFeedbackType: null,
    currentFeedbackStartTime: null,
    lastRevisionTime: null  // Track when last revision was saved
};

// Tab switching detection
let tabSwitchCount = 0;
let lastHiddenTime = null;
let hasAskedAboutAI = false;

// Language translations (comprehensive for 4-video version)
const translations = {
    en: {
        title: "INFER",
        subtitle: "An intelligent feedback system for observing classroom videos",
        login_title: "Enter Your Participant Code",
        code_help_text: "Create a code: First letter of mother's first name + birth month (2 digits) + birth year (2 digits).",
        code_example: "Example: Mother named Anna, born in August 1995 → A0895",
        student_id_label: "Student ID:",
        student_id_placeholder: "Enter your student ID",
        participant_code_label: "Anonymous ID (Participant Code):",
        code_placeholder: "e.g., ER04LF09",
        anonymous_id_help: "Generate from: First letter of mother's first name + first letter of mother's last name + birth day (2 digits) + first letter of father's first name + first letter of father's last name + birth month (2 digits). Example: Elke-Hannelore Müller, Wolf-Rüdiger Müller, born 09.11.1987 → ER04LF09",
        continue_button: "Continue",
        pre_survey_title: "Pre-Survey",
        pre_survey_subtitle: "Please complete the pre-survey before starting",
        pre_survey_description: "Please complete the survey below. This takes about 5-10 minutes.",
        next_step: "Next Step:",
        pre_survey_instructions: "Complete the survey above, then click \"Continue to Dashboard\" below.",
        continue_to_dashboard: "Continue to Dashboard",
        dashboard_title: "INFER Dashboard",
        dashboard_welcome: "Welcome back, ",
        dashboard_welcome_new: "Welcome, ",
        your_progress: "Your Progress",
        videos_completed: "0/4 Videos Completed",
        time_limit: "The site is open from February 1 to March 31. We recommend that you complete one video each week, so that you have enough time for spaced practice.",
        all_videos_completed: "All Videos Completed!",
        final_survey_prompt: "Please complete the final post-survey to finish the experiment.",
        start_post_survey: "Start Post-Survey",
        view_pre_survey: "View",
        start_pre_survey: "Start Now",
        video_link_title: "Video Link",
        video_link_subtitle: "Access the teaching video",
        video_link_label: "Video Link:",
        video_password_label: "Password (if required):",
        check_and_continue: "Check",
        open_video_link: "Open Video",
        finished_watching: "I Finished Watching the Video",
        video_watch_instructions: "<strong>Please read the following instructions carefully:</strong><br><br><strong>1.</strong> You need to take notes as you watch the video.<br><br><strong>2.</strong> You will submit your reflection on the video in the next page to complete the assignment.<br><br><strong>Recommendation:</strong> We recommend that you take notes and draft your reflection in a word processor (e.g., Word) as you watch the video, so you can paste it into the text box on the next page.",
        video_instructions_read_checkbox: "I've read the instructions",
        survey_completed_checkbox: "I have completed this survey",
        survey_required_instruction: "You must complete the survey above before checking this box.",
        survey_checkbox_required: "Please check the box to confirm you have completed the survey.",
        enter_participant_code: "Please enter your participant code.",
        video_link_not_available: "Video link not available yet.",
        enter_reflection_first: "Please enter a reflection text first.",
        video_task_title: "INFER Video Reflection Task",
        video_task_subtitle: "Analyze your teaching reflection and receive feedback",
        settings: "Settings",
        video_label: "Video:",
        language: "Feedback Language:",
        back_to_dashboard: "Dashboard",
        reflection_input: "Student Teacher Reflection",
        paste_reflection: "Paste your reflection here...",
        clear: "Clear",
        words: "words",
        generate_feedback: "Generate Feedback",
        generated_feedback: "Generated Feedback",
        feedback_placeholder: "Feedback will appear here after generation...",
        note: "Note:",
        percentage_explanation: "The percentages may add up to more than 100% because a single passage can receive multiple codes (Description, Explanation, and Prediction).",
        extended: "Extended",
        short: "Short",
        copy: "Copy",
        revise_reflection: "Revise Reflection",
        save_reflection: "Save Reflection",
        submit_final: "Submit Final Reflection",
        submit_reflection_only: "Submit Reflection",
        reflection_only_mode: "Write your reflection about the video. After submission, you will proceed to a short questionnaire. Note: The post-video questionnaire is a key part of this task.",
        learn_key_concepts: "Learn the Key Concepts for Better Reflection",
        concepts_help: "Understanding these three dimensions will help you write more comprehensive teaching reflections",
        description: "Description",
        description_def: "Accurately observing and reporting what happened in the classroom - specific behaviors, interactions, and events without interpretation.",
        explanation: "Explanation",
        explanation_def: "Interpreting observed events using educational theory, research, and pedagogical knowledge - understanding why things happened.",
        prediction: "Prediction",
        prediction_def: "Anticipating future outcomes and effects on student learning based on observed teaching practices and their interpretations.",
        post_video_survey_title: "Post-Video Survey",
        post_video_survey_subtitle: "Please share your thoughts about this video",
        post_video_questionnaire: "Post-Video Questionnaire",
        post_video_questionnaire_description: "Please complete the questionnaire below. This takes about 3-5 minutes. This questionnaire is a key part of the task and must be completed.",
        post_video_instructions: "Complete the questionnaire above, then click \"Return to Dashboard\" below.",
        return_to_dashboard: "Return to Dashboard",
        final_post_survey_title: "Final Post-Survey",
        final_post_survey_subtitle: "Thank you for completing all videos!",
        final_post_survey_description: "Please complete the final survey below. This takes about 10-15 minutes. This final survey is a key part of the study and must be completed.",
        final_step: "Final Step:",
        final_survey_instructions: "Complete the survey above, then click \"Complete Study\" below to finish.",
        complete_study: "Complete Study",
        pre_survey_completed: "Pre-Survey Completed",
        pre_survey_completed_message: "You have already completed the pre-survey. You can review it below or continue to the dashboard.",
        view_pre_survey: "View",
        presurvey_required: "You must complete the pre-survey before accessing video tasks.",
        write_reflection_placeholder: "Paste or write your reflection here...",
        paste_reflection_placeholder: "Paste or write your reflection here...",
        paste_reflection: "Paste or write your reflection here...",
        different_study_group_warning: "Warning: You are registered in a different study group. Please use the correct link for your assigned group.",
        video_reflection_note: "In the next screen, you will submit your reflection on this video. As you watch the video, we recommend that you take notes and draft your reflection in a word processor (e.g., Word), so you can paste it into the text box.",
        video_tasks: "Video Tasks",
        video_completed: "Completed",
        start_video: "Start Video",
        continue_video: "Continue",
        survey_completed: "Survey Done",
        complete_presurvey_first: "Complete Pre-Survey First",
        thank_you_title: "Thank You!",
        participation_complete: "Your participation is complete",
        study_complete: "Study Complete!",
        thank_you_message: "Thank you for your time and thoughtful reflections.",
        contribution_message: "Your contributions help improve teacher education and feedback systems.",
        percentage_explanation_simple: "The percentages of professional vision may exceed 100%, as each text segment can be coded for multiple components: description, explanation, and prediction.",
        choose_feedback_style: "Choose Your Preferred Feedback Style",
        feedback_style_intro: "We generate two types of feedback. Which would you like to see first?",
        extended_description: "Detailed academic feedback with comprehensive analysis and educational theory references",
        short_description: "Concise, easy-to-read feedback with key points and practical tips",
        can_switch_later: "You can switch between both styles anytime using the tabs after feedback is generated.",
        select_extended: "Start with Extended",
        select_short: "Start with Short",
        confirm_final_submission: "Confirm Final Submission",
        final_submission_warning: "Are you sure you want to submit your final reflection? After submission, you won't be able to make any more changes to this task.",
        final_submission_note: "You can continue revising your reflection until you're satisfied, then click this button when you're ready to move on.",
        continue_editing: "Continue Editing",
        confirm_submit: "Yes, Submit Final",
        ai_usage_title: "Tab Switch Detected",
        ai_usage_message: "We noticed you switched to another tab. Did you use another AI system (such as ChatGPT) for your work on this task?",
        ai_usage_yes: "Yes, I used AI",
        ai_usage_no: "No, I did not use AI",
        watch_tutorial: "Watch Tutorial",
        tutorial_video_title: "INFER Tutorial",
        welcome_to_infer: "Welcome to INFER",
        welcome_message: "Thank you for participating in this study on AI-supported teaching reflection. The site is open from February 1 to March 31. We recommend that you complete one video each week, so that you have enough time for spaced practice. You will analyze 4 teaching videos using our INFER system.",
        browser_recommendation: "For the best experience, we recommend using <strong>Google Chrome</strong>.",
        data_protection_header: "Data Protection Information",
        data_protection_intro: "Please read the data protection information document below.",
        open_data_protection_doc: "Open Data Protection Document",
        data_protection_checkbox: "I have read and understood the data protection information document.",
        data_consent_header: "Consent for Scientific Use",
        data_consent_intro: "Please read the consent form below and indicate whether you consent to the use of your anonymized data for scientific purposes.",
        open_consent_form: "Open Consent Form",
        data_consent_agree: "I agree to the use of my anonymized data for scientific purposes.",
        data_consent_disagree: "I do not agree to the use of my anonymized data for scientific purposes.",
        consent_disagreement_message: "You can still participate in the experiment. However, only data from participants who gave consent will be used for scientific purposes.",
        language_tooltip: "Select the language for feedback generation. Feedback will be generated in the selected language (English or German). Switch before generating, or regenerate to change the feedback language.",
        loading_messages: [
            "Please wait while the little elves create your feedback...",
            "Almost there, we promise...",
            "Computing the secret to the universe...",
            "Still making progress, don't leave yet!",
            "Grab a coffee and come back in a minute?"
        ]
    },
    de: {
        title: "INFER",
        subtitle: "Ein intelligentes Feedback-System zur Beobachtung von Unterricht",
        login_title: "Geben Sie Ihren Teilnehmer-Code ein",
        code_help_text: "Erstellen Sie einen Code: Erster Buchstabe des Vornamens der Mutter + Geburtsmonat (2 Ziffern) + Geburtsjahr (2 Ziffern).",
        code_example: "Beispiel: Mutter heißt Anna, geboren im August 1995 → A0895",
        student_id_label: "Studenten-ID:",
        student_id_placeholder: "Geben Sie Ihre Studenten-ID ein",
        participant_code_label: "Anonyme ID (Teilnehmer-Code):",
        code_placeholder: "z.B. ER04LF09",
        anonymous_id_help: "Erstellen aus: Erster Buchstabe des Vornamens der Mutter + erster Buchstabe des Nachnamens der Mutter + Geburtstag (2 Ziffern) + erster Buchstabe des Vornamens des Vaters + erster Buchstabe des Nachnamens des Vaters + Geburtsmonat (2 Ziffern). Beispiel: Elke-Hannelore Müller, Wolf-Rüdiger Müller, geboren 09.11.1987 → ER04LF09",
        continue_button: "Weiter",
        pre_survey_title: "Vor-Umfrage",
        pre_survey_subtitle: "Bitte vervollständigen Sie die Vor-Umfrage, bevor Sie beginnen",
        pre_survey_description: "Bitte vervollständigen Sie die Umfrage unten. Dies dauert etwa 5-10 Minuten.",
        next_step: "Nächster Schritt:",
        pre_survey_instructions: "Vervollständigen Sie die Umfrage oben und klicken Sie dann unten auf \"Weiter zum Dashboard\".",
        continue_to_dashboard: "Weiter zum Dashboard",
        dashboard_title: "INFER Dashboard",
        dashboard_welcome: "Willkommen zurück, ",
        dashboard_welcome_new: "Willkommen, ",
        your_progress: "Ihr Fortschritt",
        videos_completed: "0/4 Videos abgeschlossen",
        time_limit: "Die Website ist vom 1. Februar bis 31. März geöffnet. Wir empfehlen, dass Sie ein Video pro Woche abschließen, damit Sie genügend Zeit für verteiltes Üben haben.",
        all_videos_completed: "Alle Videos abgeschlossen!",
        final_survey_prompt: "Bitte vervollständigen Sie die abschließende Nach-Umfrage, um das Experiment abzuschließen.",
        start_post_survey: "Nach-Umfrage starten",
        video_link_title: "Video-Link",
        video_link_subtitle: "Zugriff auf das Unterrichtsvideo",
        video_link_label: "Video-Link:",
        video_password_label: "Passwort (falls erforderlich):",
        check_and_continue: "Prüfen",
        open_video_link: "Video öffnen",
        finished_watching: "Ich habe das Video angeschaut",
        video_watch_instructions: "<strong>Bitte lesen Sie die folgenden Anweisungen sorgfältig:</strong><br><br><strong>1.</strong> Sie müssen Notizen machen, während Sie das Video ansehen.<br><br><strong>2.</strong> Sie werden Ihre Reflexion zum Video auf der nächsten Seite einreichen, um die Aufgabe abzuschließen.<br><br><strong>Empfehlung:</strong> Wir empfehlen Ihnen, Notizen zu machen und Ihre Reflexion in einem Textverarbeitungsprogramm (z.B. Word) zu verfassen, während Sie das Video ansehen, damit Sie sie in das Textfeld auf der nächsten Seite einfügen können.",
        video_instructions_read_checkbox: "Ich habe die Anweisungen gelesen",
        survey_completed_checkbox: "Ich habe diese Umfrage abgeschlossen",
        survey_required_instruction: "Sie müssen die Umfrage oben abschließen, bevor Sie dieses Kästchen ankreuzen.",
        survey_checkbox_required: "Bitte bestätigen Sie durch Ankreuzen, dass Sie die Umfrage abgeschlossen haben.",
        enter_participant_code: "Bitte geben Sie Ihren Teilnehmer-Code ein.",
        video_link_not_available: "Video-Link ist noch nicht verfügbar.",
        enter_reflection_first: "Bitte geben Sie zuerst einen Reflexionstext ein.",
        video_task_title: "INFER Video-Reflexionsaufgabe",
        video_task_subtitle: "Analysieren Sie Ihre Unterrichtsreflexion und erhalten Sie Feedback",
        settings: "Einstellungen",
        video_label: "Video:",
        language: "Feedback-Sprache:",
        back_to_dashboard: "Dashboard",
        reflection_input: "Reflexionstext",
        paste_reflection: "Fügen Sie hier Ihre Reflexion ein...",
        clear: "Löschen",
        words: "Wörter",
        generate_feedback: "Feedback generieren",
        generated_feedback: "Generiertes Feedback",
        feedback_placeholder: "Feedback wird hier nach der Generierung angezeigt...",
        note: "Hinweis:",
        percentage_explanation: "Die Prozentsätze können mehr als 100% ergeben, da ein einzelner Abschnitt mehrere Codes erhalten kann (Beschreibung, Erklärung und Vorhersage).",
        extended: "Erweitert",
        short: "Kurz",
        copy: "Kopieren",
        revise_reflection: "Reflexion überarbeiten",
        save_reflection: "Reflexion speichern",
        submit_final: "Endgültige Reflexion einreichen",
        submit_reflection_only: "Reflexion einreichen",
        reflection_only_mode: "Schreiben Sie Ihre Reflexion über das Video. Nach der Einreichung werden Sie zu einem kurzen Fragebogen weitergeleitet.",
        learn_key_concepts: "Lernen Sie die Schlüsselkonzepte für bessere Reflexion",
        concepts_help: "Das Verständnis dieser drei Dimensionen hilft Ihnen, umfassendere Unterrichtsreflexionen zu schreiben",
        description: "Beschreibung",
        description_def: "Genaues Beobachten und Berichten des Geschehens im Klassenzimmer - spezifische Verhaltensweisen, Interaktionen und Ereignisse ohne Interpretation.",
        explanation: "Erklärung",
        explanation_def: "Interpretation von beobachteten Ereignissen mittels pädagogischer Theorie, Forschung und pädagogischem Wissen - Verstehen, warum Dinge passiert sind.",
        prediction: "Vorhersage",
        prediction_def: "Antizipation zukünftiger Ergebnisse und Auswirkungen auf das Lernen der Schüler basierend auf beobachteten Unterrichtspraktiken und deren Interpretationen.",
        post_video_survey_title: "Nach-Video-Umfrage",
        post_video_survey_subtitle: "Bitte teilen Sie Ihre Gedanken zu diesem Video mit",
        post_video_questionnaire: "Nach-Video-Fragebogen",
        post_video_questionnaire_description: "Bitte vervollständigen Sie den Fragebogen unten. Dies dauert etwa 3-5 Minuten. Dieser Fragebogen ist ein wichtiger Teil der Aufgabe und muss ausgefüllt werden.",
        post_video_instructions: "Vervollständigen Sie den Fragebogen oben und klicken Sie dann unten auf \"Zurück zum Dashboard\".",
        return_to_dashboard: "Zurück zum Dashboard",
        final_post_survey_title: "Abschließende Nach-Umfrage",
        final_post_survey_subtitle: "Vielen Dank, dass Sie alle Videos abgeschlossen haben!",
        final_post_survey_description: "Bitte vervollständigen Sie die abschließende Umfrage unten. Dies dauert etwa 10-15 Minuten. Diese abschließende Umfrage ist ein wichtiger Teil der Studie und muss ausgefüllt werden.",
        final_step: "Letzter Schritt:",
        final_survey_instructions: "Vervollständigen Sie die Umfrage oben und klicken Sie dann unten auf \"Studie abschließen\", um fertig zu werden.",
        complete_study: "Studie abschließen",
        pre_survey_completed: "Vor-Umfrage abgeschlossen",
        pre_survey_completed_message: "Sie haben die Vor-Umfrage bereits abgeschlossen. Sie können sie unten überprüfen oder zum Dashboard fortfahren.",
        view_pre_survey: "Ansehen",
        presurvey_required: "Sie müssen die Vor-Umfrage abschließen, bevor Sie auf Video-Aufgaben zugreifen können.",
        write_reflection_placeholder: "Fügen Sie hier Ihre Reflexion ein oder schreiben Sie sie hier...",
        paste_reflection_placeholder: "Fügen Sie hier Ihre Reflexion ein oder schreiben Sie sie hier...",
        paste_reflection: "Fügen Sie hier Ihre Reflexion ein oder schreiben Sie sie hier...",
        different_study_group_warning: "Warnung: Sie sind in einer anderen Studiengruppe registriert. Bitte verwenden Sie den korrekten Link für Ihre zugewiesene Gruppe.",
        video_reflection_note: "Im nächsten Bildschirm werden Sie Ihre Reflexion zu diesem Video einreichen. Während Sie das Video ansehen, empfehlen wir Ihnen, Notizen zu machen und Ihre Reflexion in einem Textverarbeitungsprogramm (z.B. Word) zu verfassen, damit Sie sie in das Textfeld einfügen können.",
        start_pre_survey: "Jetzt starten",
        video_completed: "Abgeschlossen",
        start_video: "Video starten",
        continue_video: "Fortsetzen",
        survey_completed: "Umfrage erledigt",
        complete_presurvey_first: "Zuerst Vor-Umfrage abschließen",
        data_protection_header: "Datenschutzinformationen",
        data_protection_intro: "Bitte lesen Sie das unten stehende Datenschutzdokument.",
        open_data_protection_doc: "Datenschutzdokument öffnen",
        data_protection_checkbox: "Ich habe die Datenschutzinformationen gelesen und verstanden.",
        data_consent_header: "Einverständnis zur wissenschaftlichen Nutzung",
        data_consent_intro: "Bitte lesen Sie das unten stehende Einverständnisformular und geben Sie an, ob Sie der Verwendung Ihrer anonymisierten Daten für wissenschaftliche Zwecke zustimmen.",
        open_consent_form: "Einverständnisformular öffnen",
        data_consent_agree: "Ich stimme der Verwendung meiner anonymisierten Daten für wissenschaftliche Zwecke zu.",
        data_consent_disagree: "Ich stimme der Verwendung meiner anonymisierten Daten für wissenschaftliche Zwecke nicht zu.",
        consent_disagreement_message: "Sie können trotzdem am Experiment teilnehmen. Allerdings werden nur Daten von Teilnehmern verwendet, die zugestimmt haben.",
        language_tooltip: "Wählen Sie die Sprache für die Feedback-Generierung. Das Feedback wird in der ausgewählten Sprache (Englisch oder Deutsch) generiert. Vor der Generierung wechseln oder neu generieren, um die Feedback-Sprache zu ändern.",
        welcome_to_infer: "Willkommen zu INFER",
        welcome_message: "Vielen Dank für Ihre Teilnahme an dieser Studie zur KI-gestützten Unterrichtsreflexion. Die Website ist vom 1. Februar bis 31. März geöffnet. Wir empfehlen, dass Sie ein Video pro Woche abschließen, damit Sie genügend Zeit für verteiltes Üben haben. Sie werden 4 Unterrichtsvideos mit unserem INFER-System analysieren.",
        browser_recommendation: "Für die beste Erfahrung empfehlen wir die Verwendung von <strong>Google Chrome</strong>.",
        video_tasks: "Video-Aufgaben",
        thank_you_title: "Vielen Dank!",
        participation_complete: "Ihre Teilnahme ist abgeschlossen",
        study_complete: "Studie abgeschlossen!",
        thank_you_message: "Vielen Dank für Ihre Zeit und Ihre durchdachten Reflexionen.",
        contribution_message: "Ihre Beiträge helfen, die Lehrerausbildung und Feedback-Systeme zu verbessern.",
        percentage_explanation_simple: "Die Prozentsätze der professionellen Wahrnehmung können 100% überschreiten, da jedes Textsegment für mehrere Komponenten kodiert werden kann: Beschreibung, Erklärung und Vorhersage.",
        choose_feedback_style: "Wählen Sie Ihren bevorzugten Feedback-Stil",
        feedback_style_intro: "Wir generieren zwei Arten von Feedback. Welches möchten Sie zuerst sehen?",
        extended_description: "Detailliertes akademisches Feedback mit umfassender Analyse und pädagogischen Theoriereferenzen",
        short_description: "Prägnantes, leicht lesbares Feedback mit Kernpunkten und praktischen Tipps",
        can_switch_later: "Sie können jederzeit zwischen beiden Stilen wechseln, nachdem das Feedback generiert wurde.",
        select_extended: "Mit Erweitert beginnen",
        select_short: "Mit Kurz beginnen",
        confirm_final_submission: "Endgültige Einreichung bestätigen",
        final_submission_warning: "Sind Sie sicher, dass Sie Ihre endgültige Reflexion einreichen möchten? Nach der Einreichung können Sie keine Änderungen mehr an dieser Aufgabe vornehmen.",
        final_submission_note: "Sie können Ihre Reflexion weiterhin überarbeiten, bis Sie zufrieden sind. Klicken Sie dann auf diese Schaltfläche, wenn Sie bereit sind, fortzufahren.",
        continue_editing: "Weiter bearbeiten",
        confirm_submit: "Ja, endgültig einreichen",
        ai_usage_title: "Tab-Wechsel erkannt",
        ai_usage_message: "Wir haben bemerkt, dass Sie zu einem anderen Tab gewechselt haben. Haben Sie ein anderes KI-System (wie ChatGPT) für Ihre Arbeit an dieser Aufgabe verwendet?",
        ai_usage_yes: "Ja, ich habe KI verwendet",
        ai_usage_no: "Nein, ich habe keine KI verwendet",
        watch_tutorial: "Tutorial ansehen",
        tutorial_video_title: "INFER Tutorial",
        loading_messages: [
            "Bitte warten Sie, während die kleinen Elfen Ihr Feedback erstellen...",
            "Fast geschafft, wir versprechen es...",
            "Das Geheimnis des Universums wird berechnet...",
            "Immer noch Fortschritte, gehen Sie noch nicht!",
            "Holen Sie sich einen Kaffee und kommen Sie in einer Minute wieder?"
        ]
    }
};

// Track if app is already initialized to prevent multiple calls
let appInitialized = false;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    if (appInitialized) {
        console.warn('App already initialized, skipping...');
        return;
    }
    
    console.log('Initializing INFER 4-video experiment version...');
    
    // Check if coming from assignment site (skip consent page)
    const urlParams = new URLSearchParams(window.location.search);
    const studentId = urlParams.get('student_id');
    const anonymousId = urlParams.get('anonymous_id');
    const comingFromAssignment = !!(studentId && anonymousId);
    
    if (comingFromAssignment) {
        // Coming from assignment site - hide welcome page immediately
        const welcomePage = document.getElementById('page-welcome');
        if (welcomePage) welcomePage.classList.add('d-none');
    }
    
    // Wait for Supabase library to load before initializing
    let waitInterval = null;
    let fallbackTimeout = null;
    
    waitInterval = setInterval(() => {
        if (typeof window.supabase !== 'undefined') {
            clearInterval(waitInterval);
            if (fallbackTimeout) clearTimeout(fallbackTimeout);
            
            // Initialize Supabase
            supabase = initSupabase();
            if (supabase) {
                verifySupabaseConnection(supabase);
                currentSessionId = getOrCreateSessionId();
            }
            
            if (!appInitialized) {
                appInitialized = true;
                initializeApp(comingFromAssignment, studentId, anonymousId);
            }
        }
    }, 100);
    
    // Fallback: if Supabase doesn't load after 5 seconds, initialize anyway
    fallbackTimeout = setTimeout(() => {
        if (waitInterval) clearInterval(waitInterval);
        if (appInitialized) return;
        
        if (typeof window.supabase === 'undefined') {
            console.warn('Supabase library not loaded, initializing without it');
        }
        supabase = initSupabase();
        if (supabase) {
            verifySupabaseConnection(supabase);
            currentSessionId = getOrCreateSessionId();
        }
        if (!appInitialized) {
            appInitialized = true;
            initializeApp(comingFromAssignment, studentId, anonymousId);
        }
    }, 5000);
});

// Initialize app
function initializeApp(comingFromAssignment = false, studentId = null, anonymousId = null) {
    setupEventListeners();
    renderLanguageSwitchers();
    renderLanguageSwitcherInNav();
    applyTranslations();
    
    // Set default language to German
    switchLanguage('de');
    
    // Check if coming from assignment site (with URL params) - auto-fill and login
    if (comingFromAssignment && studentId && anonymousId) {
        // Coming from assignment site - show login page briefly, auto-fill, then auto-login
        console.log('Coming from assignment site, auto-filling and logging in...', { studentId, anonymousId });
        
        // Show login page first to ensure form elements are available
        showPage('login');
        
        // Auto-fill form and trigger login
        const autoFillAndLogin = async () => {
            const codeInput = document.getElementById('participant-code-input');
            const studentIdInput = document.getElementById('student-id-input');
            
            // Wait for form elements to be available
            if (!codeInput || !studentIdInput) {
                console.log('Form elements not ready, retrying...');
                setTimeout(autoFillAndLogin, 100);
                return;
            }
            
            // Fill the form fields
            codeInput.value = anonymousId;
            studentIdInput.value = studentId;
            
            // Dispatch input events to trigger any listeners
            codeInput.dispatchEvent(new Event('input', { bubbles: true }));
            studentIdInput.dispatchEvent(new Event('input', { bubbles: true }));
            
            console.log('Form fields filled:', { 
                anonymousId: codeInput.value, 
                studentId: studentIdInput.value 
            });
            
            // Wait a moment for form to update, then call handleLogin
            setTimeout(async () => {
                if (typeof handleLogin === 'function') {
                    console.log('Calling handleLogin...');
                    await handleLogin();
                } else {
                    console.log('handleLogin not available yet, retrying...');
                    setTimeout(autoFillAndLogin, 200);
                }
            }, 200);
        };
        
        // Start auto-fill and login process after a short delay to ensure page is shown
        setTimeout(autoFillAndLogin, 300);
    } else {
        // Direct visitor - show login page (welcome page stays hidden)
        showPage('login');
    }
    
    // Log session start
    logEvent('session_start', {
        entry_page: comingFromAssignment ? 'assignment_redirect' : 'direct',
        language: currentLanguage,
        user_agent: navigator.userAgent,
        screen_width: window.screen.width,
        screen_height: window.screen.height
    });
}

// Setup event listeners
function setupEventListeners() {
    // Welcome/Consent page
    // Data protection checkbox (mandatory)
    document.getElementById('data-protection-read')?.addEventListener('change', validateConsent);
    // Consent radio buttons (mandatory choice)
    document.getElementById('data-consent-agree')?.addEventListener('change', validateConsent);
    document.getElementById('data-consent-disagree')?.addEventListener('change', validateConsent);
    document.getElementById('continue-to-login')?.addEventListener('click', handleConsentContinue);
    
    // Login page
    document.getElementById('login-button')?.addEventListener('click', handleLogin);
    document.getElementById('participant-code-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    
    // Pre-survey - MANDATORY: Must check checkbox to continue
    document.getElementById('continue-after-presurvey')?.addEventListener('click', () => {
        const checkbox = document.getElementById('presurvey-completed-check');
        if (!checkbox || !checkbox.checked) {
            // Show alert that checkbox is required
            const t = translations[currentLanguage];
            showAlert(t.survey_checkbox_required || 'Please check the box to confirm you have completed the survey.', 'warning');
            return; // Block navigation
        }
        markPreSurveyComplete();
        showPage('dashboard');
    });
    
    // Persistent navigation - Dashboard button
    document.getElementById('nav-dashboard-btn')?.addEventListener('click', () => {
        if (currentParticipant) {
            showPage('dashboard');
        }
    });
    
    // Dashboard navigation
    document.getElementById('go-to-presurvey-btn')?.addEventListener('click', () => {
        showPage('presurvey');
        loadSurvey('pre');
    });
    
    document.getElementById('start-post-survey')?.addEventListener('click', () => {
        showPage('postsurvey');
        loadSurvey('post');
    });
    
    // Back to dashboard buttons (now redundant but kept for compatibility)
    document.querySelectorAll('.back-to-dashboard-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            showPage('dashboard');
        });
    });
    
    // Language switchers (for task page)
    document.getElementById('task-lang-en')?.addEventListener('change', () => switchLanguage('en'));
    document.getElementById('task-lang-de')?.addEventListener('change', () => switchLanguage('de'));
    
    // Language switchers for all video pages (video-1 through video-4)
    for (let i = 1; i <= 4; i++) {
        document.getElementById(`video-${i}-lang-en`)?.addEventListener('change', () => switchLanguage('en'));
        document.getElementById(`video-${i}-lang-de`)?.addEventListener('change', () => switchLanguage('de'));
    }
    
    // Tutorial button removed for Gamma (Control Group has no tutorial)
    
    // Language switchers (for all pages via language-switcher-container)
    document.addEventListener('click', (e) => {
        if (e.target.id === 'lang-switch-en') {
            switchLanguage('en');
        } else if (e.target.id === 'lang-switch-de') {
            switchLanguage('de');
        }
    });
    
    // Feedback tabs
    document.getElementById('task-extended-tab')?.addEventListener('click', () => {
        if (currentTaskState.currentFeedbackType && currentTaskState.currentFeedbackStartTime) {
            endFeedbackViewing(currentTaskState.currentFeedbackType, currentLanguage);
        }
        startFeedbackViewing('extended', currentLanguage);
    });
    document.getElementById('task-short-tab')?.addEventListener('click', () => {
        if (currentTaskState.currentFeedbackType && currentTaskState.currentFeedbackStartTime) {
            endFeedbackViewing(currentTaskState.currentFeedbackType, currentLanguage);
        }
        startFeedbackViewing('short', currentLanguage);
    });
    
    // Post-video survey (legacy - kept for compatibility, but individual handlers are added below)
    document.getElementById('continue-after-post-video-survey')?.addEventListener('click', () => {
        markVideoSurveyComplete();
        showPage('dashboard');
    });
    
    // Final submission modal
    document.getElementById('confirm-final-submission')?.addEventListener('click', () => {
        const modal = bootstrap.Modal.getInstance(document.getElementById('final-submission-modal'));
        const videoNum = document.getElementById('final-submission-modal')?.dataset.videoNum;
        modal?.hide();
        if (videoNum) {
            confirmFinalSubmissionForVideo(parseInt(videoNum));
        } else {
            confirmFinalSubmission();
        }
    });
    
    // Feedback preference modal
    document.getElementById('select-extended-first')?.addEventListener('click', () => {
        userPreferredFeedbackStyle = 'extended';
        const modal = bootstrap.Modal.getInstance(document.getElementById('feedback-preference-modal'));
        modal?.hide();
    });
    document.getElementById('select-short-first')?.addEventListener('click', () => {
        userPreferredFeedbackStyle = 'short';
        const modal = bootstrap.Modal.getInstance(document.getElementById('feedback-preference-modal'));
        modal?.hide();
    });
    
    // Complete study - MANDATORY: Must complete survey to finish
    document.getElementById('complete-study')?.addEventListener('click', () => {
        // MANDATORY: Check if survey completion checkbox is checked
        const checkbox = document.getElementById('final-survey-completed-check');
        if (!checkbox || !checkbox.checked) {
            const t = translations[currentLanguage];
            showAlert(t.survey_checkbox_required || 'Please check the box to confirm you have completed the survey.', 'warning');
            return; // Block navigation
        }
        markPostSurveyComplete();
        showPage('thankyou');
    });
    
    // Final survey completion checkbox (optional)
    document.getElementById('final-survey-completed-check')?.addEventListener('change', (e) => {
        if (e.target.checked) {
            markPostSurveyComplete();
        }
    });
    
    // Video link page check buttons (4 videos)
    for (let i = 1; i <= 4; i++) {
        // Checkbox to enable/disable the continue button
        const checkbox = document.getElementById(`video-link-${i}-instructions-read`);
        const checkBtn = document.getElementById(`video-link-${i}-check-btn`);
        
        if (checkbox && checkBtn) {
            checkbox.addEventListener('change', () => {
                checkBtn.disabled = !checkbox.checked;
            });
        }
        
        // "Finished watching" button - proceed to reflection
        checkBtn?.addEventListener('click', () => {
            // Verify checkbox is checked
            if (!checkbox || !checkbox.checked) {
                const t = translations[currentLanguage];
                showAlert(t.video_instructions_read_checkbox || 'Please confirm you have read the instructions.', 'warning');
                return;
            }
            
            logEvent('video_watched_confirmed', {
                video_id: `video${i}`,
                participant_name: currentParticipant
            });
            continueToReflectionTask(i);
        });
        
        // "Open Video" link button - opens video in new tab
        document.getElementById(`video-link-${i}-open-btn`)?.addEventListener('click', (e) => {
            const videoId = `video${i}`;
            const video = VIDEOS.find(v => v.id === videoId);
            if (video && video.link) {
                logEvent('video_link_opened', {
                    video_id: videoId,
                    participant_name: currentParticipant,
                    video_url: video.link
                });
                // Link will open in new tab via target="_blank"
            } else {
                e.preventDefault();
                const t = translations[currentLanguage];
                showAlert(t.video_link_not_available || 'Video link not available yet.', 'warning');
            }
        });
    }
    
    // Post-video survey continue buttons (4 videos) - MANDATORY
    for (let i = 1; i <= 4; i++) {
        document.getElementById(`continue-after-post-video-survey-${i}`)?.addEventListener('click', () => {
            // MANDATORY: Check if survey completion checkbox is checked
            const checkbox = document.getElementById(`survey-completed-check-${i}`);
            if (!checkbox || !checkbox.checked) {
                const t = translations[currentLanguage];
                showAlert(t.survey_checkbox_required || 'Please check the box to confirm you have completed the survey.', 'warning');
                return; // Block navigation
            }
            markVideoSurveyComplete();
            showPage('dashboard');
            renderDashboard();
        });
        
        // Track checkbox status (optional - just for logging)
        document.getElementById(`survey-completed-check-${i}`)?.addEventListener('change', (e) => {
            if (e.target.checked) {
                const videoId = `video${i}`;
                logEvent('survey_completion_marked', {
                    video_id: videoId,
                    participant_name: currentParticipant,
                    survey_type: 'post_video'
                });
            }
        });
    }
    
    // Pre-survey completion checkbox (optional)
    document.getElementById('presurvey-completed-check')?.addEventListener('change', (e) => {
        if (e.target.checked) {
            markPreSurveyComplete();
        }
    });
    
    // Tab switching detection
    document.addEventListener('visibilitychange', handleTabSwitch);
}

// Tab switching detection
function handleTabSwitch() {
    if (document.hidden) {
        lastHiddenTime = Date.now();
        tabSwitchCount++;
        logEvent('tab_hidden', {
            tab_switch_count: tabSwitchCount,
            current_page: currentPage,
            video_id: currentVideoId,
            participant_name: currentParticipant || null,
            language: currentLanguage,
            timestamp: new Date().toISOString()
        });
    } else {
        const timeAway = lastHiddenTime ? (Date.now() - lastHiddenTime) / 1000 : 0;
        logEvent('tab_visible', {
            tab_switch_count: tabSwitchCount,
            time_away_seconds: timeAway,
            current_page: currentPage,
            video_id: currentVideoId,
            participant_name: currentParticipant || null,
            language: currentLanguage,
            timestamp: new Date().toISOString()
        });
        
        // Check if on any video task page (video-1, video-2, video-3, video-4)
        // Exclude video link pages and survey pages
        const isOnVideoTaskPage = currentPage && currentPage.match(/^video-[1-4]$/);
        
        if (timeAway > 5 && isOnVideoTaskPage && !hasAskedAboutAI) {
            hasAskedAboutAI = true;
            showAIUsageModal();
        }
    }
}

// Page navigation - allows free navigation between pages
function showPage(pageId) {
    document.querySelectorAll('.page-container').forEach(page => {
        page.classList.add('d-none');
    });
    
    const targetPage = document.getElementById(`page-${pageId}`);
    if (targetPage) {
        targetPage.classList.remove('d-none');
        const previousPage = currentPage;
        currentPage = pageId;
        
        // Show/hide navigation bar (visible on all pages except welcome, login and thankyou)
        const mainNav = document.getElementById('main-navigation');
        if (mainNav) {
            if (pageId === 'welcome' || pageId === 'login' || pageId === 'thankyou') {
                mainNav.classList.add('d-none');
            } else {
                mainNav.classList.remove('d-none');
                // Update participant name in nav - prefer student_id over anonymous_id
                const navParticipantName = document.getElementById('nav-participant-name');
                if (navParticipantName) {
                    // Prefer student_id if available, otherwise use participant code (anonymous_id)
                    const displayId = currentParticipantProgress?.student_id || currentParticipant || '';
                    if (displayId) {
                        navParticipantName.textContent = currentLanguage === 'en' 
                            ? `Student ID: ${displayId}`
                            : `Studenten-ID: ${displayId}`;
                    }
                }
                
                // Update dashboard button text based on current page
                const dashboardBtn = document.getElementById('nav-dashboard-btn');
                const dashboardBtnSpan = dashboardBtn?.querySelector('span');
                if (dashboardBtn && dashboardBtnSpan) {
                    if (pageId === 'dashboard') {
                        // On dashboard page, hide the button or change text
                        dashboardBtn.style.display = 'none';
                    } else {
                        // On other pages, show "Back to Dashboard"
                        dashboardBtn.style.display = 'inline-block';
                        dashboardBtnSpan.setAttribute('data-lang-key', 'back_to_dashboard');
                        dashboardBtnSpan.textContent = translations[currentLanguage].back_to_dashboard;
                    }
                }
            }
        }
        
        // Show/hide progress bar - REMOVED
        /*
        const progressContainer = document.getElementById('progress-container');
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
        */
        
        // Update progress bar - REMOVED
        /*
        if (currentParticipantProgress) {
            updateProgressBar();
        }
        */
        
        // Render dashboard if showing dashboard page (only if not already rendering)
        if (pageId === 'dashboard') {
            // Use a flag to prevent multiple simultaneous renders
            if (!window.dashboardRendering) {
                window.dashboardRendering = true;
                if (currentParticipantProgress) {
                    setTimeout(() => {
                        renderDashboard();
                        window.dashboardRendering = false;
                    }, 100);
                } else {
                    window.dashboardRendering = false;
                }
            }
            // Render language switcher in dashboard header
            setTimeout(() => {
                renderLanguageSwitcherInNav();
            }, 50);
        }
        
        // Setup video page if it's a video page
        if (pageId.startsWith('video-')) {
            const videoNum = parseInt(pageId.replace('video-', ''));
            setupVideoPageElements(videoNum);
            
            // Update video page titles/subtitles
            const videoId = `video${videoNum}`;
            const video = VIDEOS.find(v => v.id === videoId);
            if (video) {
                const ids = getVideoElementIds(videoNum);
                const titleEl = document.getElementById(ids.title);
                const subtitleEl = document.getElementById(ids.subtitle);
                if (titleEl) {
                    // Use consistent INFER Video Reflection Task title
                    titleEl.setAttribute('data-lang-key', 'video_task_title');
                    titleEl.textContent = translations[currentLanguage].video_task_title;
                }
                if (subtitleEl) {
                    subtitleEl.textContent = translations[currentLanguage].video_task_subtitle;
                }
            }
        }
        
        // Apply translations for new page
        applyTranslations();
        renderLanguageSwitchers();
        renderLanguageSwitcherInNav();
        
        // Log page view with participant info
        logEvent('page_view', {
            page: pageId,
            from_page: previousPage,
            video_id: currentVideoId,
            participant_name: currentParticipant || null,
            language: currentLanguage,
            timestamp: new Date().toISOString()
        });
    }
}

// Validate consent
function validateConsent() {
    const agreeRadio = document.getElementById('data-consent-agree');
    const disagreeRadio = document.getElementById('data-consent-disagree');
    const continueBtn = document.getElementById('continue-to-login');
    const disagreementMsg = document.getElementById('consent-disagreement-message');
    
    // Allow proceeding regardless of consent choice
    if (agreeRadio && agreeRadio.checked) {
        if (continueBtn) continueBtn.disabled = false;
        if (disagreementMsg) disagreementMsg.classList.add('d-none');
    } else if (disagreeRadio && disagreeRadio.checked) {
        // Allow proceeding even if they disagree - they can still use the tool
        if (continueBtn) continueBtn.disabled = false;
        if (disagreementMsg) disagreementMsg.classList.remove('d-none');
    }
    
    // Log consent interaction
    logEvent('consent_interaction', {
        consent_given: agreeRadio?.checked || false,
        language: currentLanguage
    });
}

// Handle consent continue
function handleConsentContinue() {
    const agreeRadio = document.getElementById('data-consent-agree');
    const disagreeRadio = document.getElementById('data-consent-disagree');
    
    // Log consent choice (or lack thereof)
    if (agreeRadio && agreeRadio.checked) {
        logEvent('consent_accepted', {
            language: currentLanguage,
            timestamp: new Date().toISOString()
        });
    } else if (disagreeRadio && disagreeRadio.checked) {
        logEvent('consent_declined', {
            language: currentLanguage,
            timestamp: new Date().toISOString()
        });
    }
    
    // Allow proceeding regardless of choice
    showPage('login');
}

// Track if login is in progress to prevent duplicate calls
let loginInProgress = false;

// Login handler
async function handleLogin() {
    // Prevent duplicate login calls
    if (loginInProgress) {
        console.log('Login already in progress, skipping...');
        return;
    }
    
    loginInProgress = true;
    
    const codeInput = document.getElementById('participant-code-input');
    const studentIdInput = document.getElementById('student-id-input');
    const participantCode = codeInput?.value.trim().toUpperCase();
    const studentId = studentIdInput?.value.trim();
    
    if (!participantCode) {
        loginInProgress = false;
        const t = translations[currentLanguage];
        showAlert(t.enter_participant_code || 'Please enter your participant code.', 'warning');
        return;
    }
    
    if (!studentId) {
        loginInProgress = false;
        const t = translations[currentLanguage];
        showAlert(t.student_id_label || 'Please enter your student ID.', 'warning');
        return;
    }
    
    // Check if participant exists
    const progress = await loadParticipantProgress(participantCode);
    
    if (progress) {
        // Returning participant - restore all progress
        currentParticipant = participantCode;
        currentParticipantProgress = progress;
        
        // Verify treatment_group matches current site (prevent group switching)
        const existingTreatmentGroup = progress.treatment_group;
        if (existingTreatmentGroup && existingTreatmentGroup !== STUDY_CONDITION) {
            console.warn(`Participant ${participantCode} is assigned to ${existingTreatmentGroup} but accessing ${STUDY_CONDITION} site`);
            showAlert(
                `Error: You are registered in a different study group (${existingTreatmentGroup}). Please use the correct link for your assigned group. Access blocked.`,
                'danger'
            );
            // Block access - don't allow them to continue
            logEvent('wrong_site_access_attempt', {
                participant_name: participantCode,
                assigned_group: existingTreatmentGroup,
                attempted_site: STUDY_CONDITION
            });
            return; // Exit function - don't proceed
        } else if (!existingTreatmentGroup) {
            // If treatment_group is missing, set it based on current site
            console.log(`Setting missing treatment_group to ${STUDY_CONDITION} for ${participantCode}`);
            if (supabase) {
                supabase.from('participant_progress')
                    .update({ treatment_group: STUDY_CONDITION })
                    .eq('participant_name', participantCode)
                    .then(() => {
                        currentParticipantProgress.treatment_group = STUDY_CONDITION;
                        console.log('Updated treatment_group for', participantCode);
                    });
            }
        }
        
        // Ensure arrays are properly initialized
        if (!currentParticipantProgress.videos_completed) currentParticipantProgress.videos_completed = [];
        if (!currentParticipantProgress.video_surveys) currentParticipantProgress.video_surveys = {};
        
        // Update last active time, student_id, and anonymous_id if provided
        if (supabase) {
            const updateData = { 
                last_active_at: new Date().toISOString(),
                anonymous_id: participantCode  // anonymous_id is the same as participant_name
            };
            if (studentId) {
                updateData.student_id = studentId;
            }
            supabase.from('participant_progress')
                .update(updateData)
                .eq('participant_name', participantCode)
                .then(() => console.log('Updated last_active_at, student_id, and anonymous_id for', participantCode));
        }
        
        // Show resume message
        const resumeInfo = document.getElementById('resume-info');
        const resumeMessage = document.getElementById('resume-message');
        if (resumeInfo && resumeMessage) {
            const videosDone = progress.videos_completed?.length || 0;
            resumeMessage.textContent = `Welcome back! You have completed ${videosDone}/4 videos.`;
            resumeInfo.classList.remove('d-none');
        }
        
        console.log('Restored progress for', participantCode, ':', currentParticipantProgress);
        
        // Always show dashboard first - don't auto-navigate to pre-survey
        // Remove delay to make it smoother
        showPage('dashboard');
        // renderDashboard will be called automatically by showPage
    } else {
        // New participant
        currentParticipant = participantCode;
        const condition = assignCondition(participantCode);
        
        // Create new progress record
        await createParticipantProgress(participantCode, condition, studentId);
        currentParticipantProgress = {
            participant_name: participantCode,
            assigned_condition: condition,
            treatment_group: STUDY_CONDITION,
            videos_completed: [],
            pre_survey_completed: false,
            post_survey_completed: false,
            video_surveys: {}
        };
        
        logEvent('participant_registered', {
            participant_name: participantCode,
            treatment_group: STUDY_CONDITION,
            study_version: STUDY_VERSION,
            assigned_condition: condition
        });
        
        // Hide resume message for new users
        const resumeInfo = document.getElementById('resume-info');
        if (resumeInfo) {
            resumeInfo.classList.add('d-none');
        }
        
        // Show dashboard first - don't auto-navigate to pre-survey
        // Remove delay to make it smoother
        showPage('dashboard');
        // renderDashboard will be called automatically by showPage
    }
    
    // Reset login flag
    loginInProgress = false;
}

// Assign condition (random 50/50)
function assignCondition(participantName) {
    return Math.random() < 0.5 ? 'control' : 'experimental';
}

// Load participant progress
async function loadParticipantProgress(participantName) {
    if (!supabase) {
        console.warn('Supabase not initialized, cannot load progress');
        return null;
    }
    
    try {
        const { data, error } = await supabase
            .from('participant_progress')
            .select('*')
            .eq('participant_name', participantName)
            .maybeSingle(); // Use maybeSingle() to handle empty results gracefully
        
        if (error) {
            console.error('Error loading progress:', error);
            return null;
        }
        
        if (data) {
            console.log('Loaded progress for', participantName, ':', data);
            // Ensure arrays are properly initialized
            if (!data.videos_completed) data.videos_completed = [];
            if (!data.video_surveys) data.video_surveys = {};
            return data;
        }
        
        console.log('No existing progress found for', participantName);
        return null;
    } catch (error) {
        console.error('Error in loadParticipantProgress:', error);
        return null;
    }
}

// Create participant progress
async function createParticipantProgress(participantName, condition, studentId = null) {
    if (!supabase) return;
    
    try {
        // Use upsert to handle existing participants gracefully
        const progressData = {
            participant_name: participantName,
            assigned_condition: condition,
            videos_completed: [],
            pre_survey_completed: false,
            post_survey_completed: false,
            video_surveys: {},
            last_active_at: new Date().toISOString()
        };
        
        // Add student_id and anonymous_id if provided
        if (studentId) {
            progressData.student_id = studentId;
        }
        // anonymous_id is the same as participant_name (the participant code)
        progressData.anonymous_id = participantName;
        
        // Always set treatment_group based on which site they're accessing
        // This ensures participants are assigned to the correct group based on their link
        let { error } = await supabase
            .from('participant_progress')
            .upsert([{
                ...progressData,
                treatment_group: STUDY_CONDITION  // Set based on current site (Alpha/Beta/Gamma)
            }], {
                onConflict: 'participant_name',
                ignoreDuplicates: false
            });
        
        // If treatment_group column doesn't exist, try without it (shouldn't happen after migration)
        if (error && error.message && error.message.includes('treatment_group')) {
            console.warn('treatment_group column not found, creating without it');
            console.warn('Please run MIGRATE_SUPABASE_SCHEMA.sql to add the treatment_group column');
            const { error: error2 } = await supabase
                .from('participant_progress')
                .upsert([progressData], {
                    onConflict: 'participant_name',
                    ignoreDuplicates: false
                });
            if (error2) {
                console.error('Error creating progress (without treatment_group):', error2);
            }
        } else if (error) {
            console.error('Error creating progress:', error);
        } else {
            console.log(`Created progress for ${participantName} with treatment_group: ${STUDY_CONDITION}`);
        }
    } catch (error) {
        console.error('Error in createParticipantProgress:', error);
    }
}

// Render dashboard
function renderDashboard() {
    // Prevent multiple simultaneous renders
    if (window.dashboardRendering) {
        console.log('Dashboard already rendering, skipping...');
        return;
    }
    
    console.log('renderDashboard called', { currentParticipantProgress, currentParticipant });
    
    if (!currentParticipantProgress) {
        console.warn('No participant progress available');
        return;
    }
    
    window.dashboardRendering = true;
    
    // Update welcome message with participant name - prefer student_id
    const welcomeText = document.getElementById('dashboard-welcome-text');
    const nameEl = document.getElementById('dashboard-participant-name');
    if (welcomeText && nameEl) {
        // Check if this is a returning user (has any progress)
        const isReturningUser = currentParticipantProgress && (
            (currentParticipantProgress.videos_completed && currentParticipantProgress.videos_completed.length > 0) ||
            currentParticipantProgress.pre_survey_completed ||
            currentParticipantProgress.post_survey_completed ||
            (currentParticipantProgress.video_surveys && Object.keys(currentParticipantProgress.video_surveys).length > 0)
        );
        
        // Prefer student_id over anonymous_id for display
        const displayId = currentParticipantProgress?.student_id || currentParticipant || '';
        
        if (displayId) {
            if (isReturningUser) {
                // Returning user - show "Welcome back"
                welcomeText.textContent = translations[currentLanguage].dashboard_welcome;
                nameEl.textContent = ` ${displayId}`;
            } else {
                // New user - just show "Welcome"
                welcomeText.textContent = translations[currentLanguage].dashboard_welcome_new || 'Welcome';
                nameEl.textContent = ` ${displayId}`;
            }
            nameEl.style.fontWeight = '600';
        } else {
            welcomeText.textContent = translations[currentLanguage].dashboard_welcome.replace(',', '');
            nameEl.textContent = '';
        }
    }
    
    // Update progress bar
    updateProgressBar();
    
    // Update pre-survey status
    updatePreSurveyStatus();
    
    // Render video cards
    const container = document.getElementById('video-cards-container');
    if (!container) {
        console.error('video-cards-container not found');
        // Try to find it after a short delay (might not be rendered yet)
        setTimeout(() => {
            const retryContainer = document.getElementById('video-cards-container');
            if (retryContainer && VIDEOS && VIDEOS.length > 0) {
                retryContainer.innerHTML = '';
                VIDEOS.forEach((video, index) => {
                    const isCompleted = currentParticipantProgress.videos_completed?.includes(video.id) || false;
                    const videoSurveyCompleted = currentParticipantProgress.video_surveys?.[video.id] || false;
                    const card = createVideoCard(video, index + 1, isCompleted, videoSurveyCompleted);
                    retryContainer.appendChild(card);
                });
            }
        }, 200);
        return;
    }
    
    container.innerHTML = '';
    
    if (!VIDEOS || VIDEOS.length === 0) {
        console.error('VIDEOS array is empty or undefined. VIDEOS =', VIDEOS);
        container.innerHTML = '<div class="col-12"><div class="alert alert-warning">No videos configured. Please check VIDEOS array in app.js</div></div>';
        return;
    }
    
    console.log(`Rendering ${VIDEOS.length} video cards...`);
    VIDEOS.forEach((video, index) => {
        const isCompleted = currentParticipantProgress.videos_completed?.includes(video.id) || false;
        const videoSurveyCompleted = currentParticipantProgress.video_surveys?.[video.id] || false;
        const card = createVideoCard(video, index + 1, isCompleted, videoSurveyCompleted);
        container.appendChild(card);
        console.log(`Video card ${index + 1} rendered for ${video.id}`);
    });
    
    console.log(`Successfully rendered ${VIDEOS.length} video cards`);
    
    // Update post-survey status
    updatePostSurveyStatus();
    
    console.log('Dashboard rendered successfully');
    window.dashboardRendering = false;
}

// Update pre-survey status on dashboard
function updatePreSurveyStatus() {
    const isCompleted = currentParticipantProgress?.pre_survey_completed || false;
    const badge = document.getElementById('presurvey-status-badge');
    const viewBtn = document.getElementById('go-to-presurvey-btn');
    const warning = document.getElementById('presurvey-warning');
    
    if (badge) {
        const t = translations[currentLanguage];
        if (isCompleted) {
            badge.className = 'badge bg-success d-block mb-2';
            badge.textContent = '✓ ' + (t.pre_survey_completed || 'Completed');
        } else {
            badge.className = 'badge bg-secondary d-block mb-2';
            badge.textContent = (currentLanguage === 'en' ? 'Not Completed' : 'Nicht abgeschlossen');
        }
    }
    
    if (viewBtn) {
        const t = translations[currentLanguage];
        viewBtn.textContent = isCompleted 
            ? (t.view_pre_survey || 'View')
            : (t.start_pre_survey || 'Start Now');
        viewBtn.className = isCompleted
            ? 'btn btn-sm btn-outline-primary w-100'
            : 'btn btn-sm btn-primary w-100';
    }
    
    if (warning) {
        if (!isCompleted) {
            warning.classList.remove('d-none');
        } else {
            warning.classList.add('d-none');
        }
    }
}

// Update post-survey status on dashboard
function updatePostSurveyStatus() {
    const videosDone = currentParticipantProgress?.videos_completed?.length || 0;
    const allVideosDone = videosDone >= 4;
    const isCompleted = currentParticipantProgress?.post_survey_completed || false;
    
    const badge = document.getElementById('postsurvey-status-badge');
    const startBtn = document.getElementById('start-post-survey');
    
    if (badge) {
        if (isCompleted) {
            badge.className = 'badge bg-success';
            badge.textContent = currentLanguage === 'en' ? 'Completed' : 'Abgeschlossen';
        } else if (allVideosDone) {
            badge.className = 'badge bg-primary';
            badge.textContent = currentLanguage === 'en' ? 'Available' : 'Verfügbar';
        } else {
            badge.className = 'badge bg-secondary';
            badge.textContent = currentLanguage === 'en' ? 'Not Available' : 'Nicht verfügbar';
        }
    }
    
    if (startBtn) {
        if (allVideosDone && !isCompleted) {
            startBtn.classList.remove('d-none');
        } else {
            startBtn.classList.add('d-none');
        }
    }
}

// Create video card
function createVideoCard(video, number, isCompleted, surveyCompleted) {
    const card = document.createElement('div');
    card.className = 'col-md-6 col-lg-3';
    
    const t = translations[currentLanguage];
    const completedText = t.video_completed || (currentLanguage === 'en' ? 'Completed' : 'Abgeschlossen');
    const startText = t.start_video || (currentLanguage === 'en' ? 'Start Video' : 'Video starten');
    const continueText = t.continue_video || (currentLanguage === 'en' ? 'Continue' : 'Fortsetzen');
    const surveyText = t.survey_completed || (currentLanguage === 'en' ? 'Survey Done' : 'Umfrage erledigt');
    const preSurveyRequired = t.complete_presurvey_first || (currentLanguage === 'en' ? 'Complete Pre-Survey First' : 'Zuerst Vor-Umfrage abschließen');
    
    // Pre-survey is MANDATORY - block videos until completed
    const canAccess = currentParticipantProgress?.pre_survey_completed || false;
    
    // Button texts based on language
    const btnCompletedText = t.video_completed;
    const btnStartText = t.start_video;
    const btnContinueText = t.continue_video;
    const btnSurveyText = t.survey_completed;
    
    card.innerHTML = `
        <div class="card h-100 video-card ${isCompleted ? 'completed' : ''} ${!canAccess ? 'locked' : ''}" data-video-id="${video.id}">
            <div class="card-body text-center">
                <h5>${currentLanguage === 'en' ? 'Video' : 'Video'} ${number}</h5>
                <p class="text-muted small">${video.name}</p>
                ${!canAccess 
                    ? `<div>
                        <span class="badge bg-warning text-dark mb-2"><i class="bi bi-lock"></i> ${preSurveyRequired}</span>
                        <button class="btn btn-secondary btn-sm mt-2 locked-video-btn" disabled>${btnStartText}</button>
                       </div>`
                    : isCompleted 
                        ? `<div>
                            <span class="badge bg-success mb-2"><i class="bi bi-check-circle"></i> ${btnCompletedText}</span>
                            ${surveyCompleted ? `<div><small class="text-muted"><i class="bi bi-clipboard-check"></i> ${btnSurveyText}</small></div>` : ''}
                            <button class="btn btn-outline-primary btn-sm mt-2 view-video-btn" data-video-id="${video.id}">${btnContinueText}</button>
                           </div>`
                        : `<button class="btn btn-primary start-video-btn" data-video-id="${video.id}">${btnStartText}</button>`
                }
            </div>
        </div>
    `;
    
    // Add click handler for start/continue button - only if pre-survey is completed
    const startBtn = card.querySelector('.start-video-btn');
    const viewBtn = card.querySelector('.view-video-btn');
    
    if (startBtn && canAccess) {
        startBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            startVideoTask(video.id);
            return false;
        });
    }
    
    if (viewBtn && canAccess) {
        viewBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            startVideoTask(video.id);
            return false;
        });
    }
    
    return card;
}

// ============================================================================
// TUTORIAL VIDEO (Treatment Group 1 Only)
// ============================================================================

// Show tutorial page before Video 2
function showTutorialPage(videoId) {
    const t = translations[currentLanguage];
    
    // Create tutorial page if it doesn't exist
    let tutorialPage = document.getElementById('page-tutorial');
    if (!tutorialPage) {
        tutorialPage = createTutorialPage();
        document.body.appendChild(tutorialPage);
    }
    
    // Update tutorial page content
    const titleEl = tutorialPage.querySelector('.tutorial-title');
    const subtitleEl = tutorialPage.querySelector('.tutorial-subtitle');
    const descEl = tutorialPage.querySelector('.tutorial-description');
    const instructionsEl = tutorialPage.querySelector('.tutorial-instructions');
    const openBtn = tutorialPage.querySelector('#open-tutorial-btn');
    
    if (titleEl) titleEl.textContent = t.tutorial_video_title || 'Tutorial: How to Use INFER';
    if (subtitleEl) subtitleEl.textContent = t.tutorial_video_subtitle || 'Please watch this tutorial before starting Video 2';
    if (descEl) descEl.textContent = t.tutorial_video_description || 'This short tutorial will explain how to use the INFER feedback system effectively.';
    if (instructionsEl) instructionsEl.textContent = t.tutorial_watch_instructions || 'Click "Open Tutorial" to watch. After watching, click "Continue to Video Task".';
    
    if (openBtn) {
        openBtn.href = TUTORIAL_VIDEO.link;
        const openText = openBtn.querySelector('span');
        if (openText) openText.textContent = t.open_tutorial || 'Open Tutorial';
    }
    
    // Store the target video ID
    tutorialPage.dataset.targetVideoId = videoId;
    
    // Show tutorial page
    showPage('tutorial');
    
    logEvent('tutorial_page_shown', {
        participant_name: currentParticipant,
        target_video_id: videoId
    });
}

// Track tutorial watch status
let tutorialWatchProgress = 0;
let tutorialWatched = false;

// Create tutorial page HTML
function createTutorialPage() {
    const t = translations[currentLanguage];
    const page = document.createElement('div');
    page.id = 'page-tutorial';
    page.className = 'page-container d-none';
    // Remove margin-top to use full height
    page.style.marginTop = '0';
    page.style.paddingTop = '10px';
    page.style.height = '100vh';
    page.style.overflow = 'hidden';
    
    page.innerHTML = `
        <div class="main-container h-100" style="max-width: 100%; padding: 0 20px;">
            <div class="row justify-content-center h-100">
                <div class="col-12 h-100">
                    <div class="card h-100 border-0 shadow-none" style="background: transparent;">
                        <div class="card-header text-center bg-transparent border-0 py-1">
                            <h5 class="tutorial-title mb-0 text-primary fw-bold" style="font-size: 1.1rem;">${t.tutorial_video_title || 'INFER Tutorial'}</h5>
                        </div>
                        <div class="card-body d-flex flex-column align-items-center p-0 h-100">
                            <!-- Minimal info section -->
                            <div class="alert alert-info py-1 px-3 mb-2" style="font-size: 0.85rem; max-width: 800px;">
                                <i class="bi bi-info-circle me-2"></i>
                                <span class="tutorial-description">${t.tutorial_video_description || 'Please watch the entire video below to learn how to use the system.'}</span>
                            </div>
                            
                            <!-- Massive video player taking remaining height -->
                            <div class="video-container flex-grow-1 w-100 d-flex justify-content-center align-items-center" style="background: #000; border-radius: 8px; overflow: hidden; max-height: 80vh;">
                                <video id="page-tutorial-video-player" controls controlsList="nodownload" style="width: 100%; height: 100%; max-height: 100%; object-fit: contain;">
                                    <source src="${TUTORIAL_VIDEO.link}" type="video/mp4">
                                    Your browser does not support the video tag.
                                </video>
                            </div>
                            
                            <!-- Bottom controls -->
                            <div class="mt-2 text-center pb-3" style="min-height: 60px;">
                                <div class="form-check mb-2 d-inline-block">
                                    <input class="form-check-input" type="checkbox" id="tutorial-watched-check" disabled>
                                    <label class="form-check-label small text-muted" for="tutorial-watched-check">
                                        ${t.tutorial_completed_checkbox || 'I have watched the tutorial video'}
                                    </label>
                                </div>
                                <div class="ms-3 d-inline-block">
                                    <button id="continue-after-tutorial" class="btn btn-secondary btn-sm px-4 fw-bold" disabled>
                                        <span>${t.continue_after_tutorial || 'Continue'}</span>
                                        <i class="bi bi-arrow-right ms-1"></i>
                                    </button>
                                </div>
                                <div class="alert alert-warning d-none py-1 px-2 mt-1 d-inline-block ms-2" id="tutorial-warning" style="font-size: 0.8rem;">
                                    <span>Watch until end to continue</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add event listeners
    const continueBtn = page.querySelector('#continue-after-tutorial');
    const checkbox = page.querySelector('#tutorial-watched-check');
    const videoPlayer = page.querySelector('#page-tutorial-video-player');
    const warning = page.querySelector('#tutorial-warning');
    
    if (videoPlayer) {
        // Track progress
        videoPlayer.addEventListener('timeupdate', () => {
            if (videoPlayer.duration > 0) {
                const progress = videoPlayer.currentTime / videoPlayer.duration;
                if (progress > tutorialWatchProgress) {
                    tutorialWatchProgress = progress;
                }
                
                // Enable continue if watched at least 90%
                if (tutorialWatchProgress > 0.9 && !tutorialWatched) {
                    tutorialWatched = true;
                    if (checkbox) {
                        checkbox.disabled = false;
                        checkbox.checked = true;
                    }
                    if (continueBtn) {
                        continueBtn.disabled = false;
                        continueBtn.classList.remove('btn-secondary');
                        continueBtn.classList.add('btn-success');
                    }
                    if (warning) warning.classList.add('d-none');
                }
            }
        });
        
        videoPlayer.addEventListener('ended', () => {
            tutorialWatched = true;
            if (checkbox) {
                checkbox.disabled = false;
                checkbox.checked = true;
            }
            if (continueBtn) {
                continueBtn.disabled = false;
                continueBtn.classList.remove('btn-secondary');
                continueBtn.classList.add('btn-success');
            }
            if (warning) warning.classList.add('d-none');
        });
        
        videoPlayer.addEventListener('play', () => {
            logEvent('tutorial_video_started', {
                participant_name: currentParticipant,
                tutorial_url: TUTORIAL_VIDEO.link
            });
        });
    }
    
    if (continueBtn) {
        continueBtn.addEventListener('click', () => {
            if (!tutorialWatched) {
                if (warning) {
                    warning.classList.remove('d-none');
                    warning.textContent = 'Please watch the video until the end before continuing.';
                }
                return;
            }
            
            if (!checkbox || !checkbox.checked) {
                const t = translations[currentLanguage];
                showAlert(t.survey_checkbox_required || 'Please check the box to confirm you have watched the tutorial.', 'warning');
                return;
            }
            
            // Mark tutorial as watched
            markTutorialWatched();
            
            // Continue to the target video
            const targetVideoId = document.getElementById('page-tutorial').dataset.targetVideoId;
            if (targetVideoId) {
                const videoNum = getVideoPageNumber(targetVideoId);
                continueToReflectionTask(videoNum);
            }
        });
    }
    
    return page;
}

// Mark tutorial as watched in database
async function markTutorialWatched() {
    if (!supabase || !currentParticipant) return;
    
    try {
        const { error } = await supabase
            .from('participant_progress')
            .update({ 
                tutorial_watched: true,
                tutorial_watched_at: new Date().toISOString(),
                last_active_at: new Date().toISOString()
            })
            .eq('participant_name', currentParticipant);
        
        if (error) {
            console.error('Error marking tutorial watched:', error);
        } else {
            currentParticipantProgress.tutorial_watched = true;
            logEvent('tutorial_completed', {
                participant_name: currentParticipant
            });
        }
    } catch (error) {
        console.error('Error in markTutorialWatched:', error);
    }
}

// Start video task after tutorial is complete
async function startVideoTaskAfterTutorial(videoId) {
    currentVideoId = videoId;
    const video = VIDEOS.find(v => v.id === videoId);
    
    if (!video) return;
    
    const videoNum = getVideoPageNumber(videoId);
    
    // Update video link page with video info
    const linkPageSubtitle = document.getElementById(`video-link-${videoNum}-subtitle`);
    const linkPageName = document.getElementById(`video-link-${videoNum}-name`);
    const linkPageUrl = document.getElementById(`video-link-${videoNum}-url`);
    const linkPagePassword = document.getElementById(`video-link-${videoNum}-password`);
    const linkPageOpenBtn = document.getElementById(`video-link-${videoNum}-open-btn`);
    
    if (linkPageSubtitle) {
        linkPageSubtitle.setAttribute('data-lang-key', 'video_link_subtitle');
    }
    if (linkPageName) {
        linkPageName.textContent = video.name;
    }
    if (linkPageUrl) {
        linkPageUrl.value = video.link;
    }
    if (linkPagePassword && video.password) {
        linkPagePassword.value = video.password;
    }
    if (linkPageOpenBtn) {
        linkPageOpenBtn.href = video.link;
    }
    
    // Show video link page
    showPage(`video-link-${videoNum}`);
    
    logEvent('video_task_started_after_tutorial', {
        video_id: videoId,
        participant_name: currentParticipant
    });
}

// Get video page number from video ID
function getVideoPageNumber(videoId) {
    const index = VIDEOS.findIndex(v => v.id === videoId);
    return index >= 0 ? index + 1 : 1;
}

// Get element IDs for a specific video page
function getVideoElementIds(videoNum) {
    return {
        title: `video-${videoNum}-title`,
        subtitle: `video-${videoNum}-subtitle`,
        participantCode: `video-${videoNum}-participant-code`,
        videoName: `video-${videoNum}-video-name`,
        reflectionText: `video-${videoNum}-reflection-text`,
        wordCount: `video-${videoNum}-word-count`,
        generateBtn: `video-${videoNum}-generate-btn`,
        saveBtn: `video-${videoNum}-save-btn`,
        submitBtn: `video-${videoNum}-submit-btn`,
        clearBtn: `video-${videoNum}-clear-btn`,
        copyBtn: `video-${videoNum}-copy-btn`,
        reviseBtn: `video-${videoNum}-revise-btn`,
        loadingSpinner: `video-${videoNum}-loading-spinner`,
        loadingText: `video-${videoNum}-loading-text`,
        percentageExplanation: `video-${videoNum}-percentage-explanation`,
        feedbackTabs: `video-${videoNum}-feedback-tabs`,
        feedbackExtended: `video-${videoNum}-feedback-extended`,
        feedbackShort: `video-${videoNum}-feedback-short`,
        extendedTab: `video-${videoNum}-extended-tab`,
        shortTab: `video-${videoNum}-short-tab`,
        langEn: `video-${videoNum}-lang-en`,
        langDe: `video-${videoNum}-lang-de`,
        backBtn: `back-to-dashboard-btn`
    };
}

// Setup event listeners for a specific video page
function setupVideoPageElements(videoNum) {
    const ids = getVideoElementIds(videoNum);
    
    // Set up event listeners
    const reflectionText = document.getElementById(ids.reflectionText);
    if (reflectionText) {
        reflectionText.addEventListener('input', () => updateWordCountForVideo(videoNum));
    }
    
    const generateBtn = document.getElementById(ids.generateBtn);
    if (generateBtn) {
        generateBtn.addEventListener('click', () => handleGenerateFeedbackForVideo(videoNum));
    }
    
    const clearBtn = document.getElementById(ids.clearBtn);
    if (clearBtn) {
        clearBtn.addEventListener('click', () => handleClearForVideo(videoNum));
    }
    
    const copyBtn = document.getElementById(ids.copyBtn);
    if (copyBtn) {
        copyBtn.addEventListener('click', () => handleCopyForVideo(videoNum));
    }
    
    const reviseBtn = document.getElementById(ids.reviseBtn);
    if (reviseBtn) {
        reviseBtn.addEventListener('click', () => handleReviseForVideo(videoNum));
    }
    
    const saveBtn = document.getElementById(ids.saveBtn);
    if (saveBtn) {
        saveBtn.addEventListener('click', () => handleSaveReflection(videoNum));
    }
    
    const submitBtn = document.getElementById(ids.submitBtn);
    if (submitBtn) {
        submitBtn.addEventListener('click', () => handleFinalSubmissionForVideo(videoNum));
    }
    
    const extendedTab = document.getElementById(ids.extendedTab);
    if (extendedTab) {
        extendedTab.addEventListener('click', () => startFeedbackViewing('extended', currentLanguage));
    }
    
    const shortTab = document.getElementById(ids.shortTab);
    if (shortTab) {
        shortTab.addEventListener('click', () => startFeedbackViewing('short', currentLanguage));
    }
    
    const langEn = document.getElementById(ids.langEn);
    if (langEn) {
        langEn.addEventListener('change', () => switchLanguage('en'));
    }
    
    const langDe = document.getElementById(ids.langDe);
    if (langDe) {
        langDe.addEventListener('change', () => switchLanguage('de'));
    }
    
    // Setup concept explanation card click handlers
    setupConceptCardClickHandlers(videoNum);
    
    // Setup concept section expand/collapse logging
    setupConceptSectionExpandLogging(videoNum);
}

// Setup logging for concept section expand/collapse
function setupConceptSectionExpandLogging(videoNum) {
    const conceptsSection = document.getElementById(`video-${videoNum}-concepts-section`);
    if (!conceptsSection) return;
    
    const definitionsContent = document.getElementById(`video-${videoNum}-definitions-content`);
    if (!definitionsContent) return;
    
    let expandStartTime = null;
    
    // Listen for when the section is expanded (shown)
    definitionsContent.addEventListener('shown.bs.collapse', () => {
        expandStartTime = Date.now();
        
        logEvent('concept_section_expanded', {
            video_id: `video${videoNum}`,
            participant_name: currentParticipant,
            timestamp: expandStartTime
        });
    });
    
    // Listen for when the section is collapsed (hidden)
    definitionsContent.addEventListener('hidden.bs.collapse', () => {
        if (expandStartTime) {
            const durationSeconds = (Date.now() - expandStartTime) / 1000;
            
            logEvent('concept_section_collapsed', {
                video_id: `video${videoNum}`,
                participant_name: currentParticipant,
                duration_seconds: durationSeconds,
                timestamp: Date.now()
            });
            
            expandStartTime = null;
        }
    });
}

// Setup click handlers for concept explanation cards
function setupConceptCardClickHandlers(videoNum) {
    const conceptsSection = document.getElementById(`video-${videoNum}-concepts-section`);
    if (!conceptsSection) return;
    
    // Find all definition cards
    const descriptionCard = conceptsSection.querySelector('.description-card');
    const explanationCard = conceptsSection.querySelector('.explanation-card');
    const predictionCard = conceptsSection.querySelector('.prediction-card');
    
    if (descriptionCard) {
        descriptionCard.style.cursor = 'pointer';
        descriptionCard.addEventListener('click', () => {
            logEvent('concept_explanation_clicked', {
                video_id: `video${videoNum}`,
                concept_name: 'Description',
                concept_type: 'description',
                participant_name: currentParticipant
            });
        });
    }
    
    if (explanationCard) {
        explanationCard.style.cursor = 'pointer';
        explanationCard.addEventListener('click', () => {
            logEvent('concept_explanation_clicked', {
                video_id: `video${videoNum}`,
                concept_name: 'Explanation',
                concept_type: 'explanation',
                participant_name: currentParticipant
            });
        });
    }
    
    if (predictionCard) {
        predictionCard.style.cursor = 'pointer';
        predictionCard.addEventListener('click', () => {
            logEvent('concept_explanation_clicked', {
                video_id: `video${videoNum}`,
                concept_name: 'Prediction',
                concept_type: 'prediction',
                participant_name: currentParticipant
            });
        });
    }
}

// Start video task - now goes to video link page first
async function startVideoTask(videoId) {
    // Pre-survey is MANDATORY - block access if not completed
    if (!currentParticipantProgress?.pre_survey_completed) {
        const t = translations[currentLanguage];
        showAlert(t.presurvey_required || 'You must complete the pre-survey before accessing video tasks.', 'warning');
        showPage('presurvey');
        loadSurvey('pre');
        return;
    }
    
    currentVideoId = videoId;
    const video = VIDEOS.find(v => v.id === videoId);
    
    if (!video) return;
    
    // Tutorial check removed for Gamma (Control Group has no tutorial)
    // if (video.hasTutorial && !currentParticipantProgress?.tutorial_watched) {
    //     showTutorialPage(videoId);
    //     return;
    // }
    
    const videoNum = getVideoPageNumber(videoId);
    
    // Update video link page with video info
    const linkPageSubtitle = document.getElementById(`video-link-${videoNum}-subtitle`);
    const linkPageName = document.getElementById(`video-link-${videoNum}-name`);
    const linkPageUrl = document.getElementById(`video-link-${videoNum}-url`);
    const linkPagePassword = document.getElementById(`video-link-${videoNum}-password`);
    const linkPageOpenBtn = document.getElementById(`video-link-${videoNum}-open-btn`);
    
    if (linkPageSubtitle) {
        linkPageSubtitle.setAttribute('data-lang-key', 'video_link_subtitle');
    }
    if (linkPageName) {
        linkPageName.textContent = video.name;
    }
    if (linkPageUrl) {
        linkPageUrl.value = video.link || '';
    }
    if (linkPagePassword) {
        linkPagePassword.value = video.password || '';
    }
    if (linkPageOpenBtn && video.link) {
        linkPageOpenBtn.href = video.link;
    }
    
    // Show video link page first
    const videoLinkPageId = `video-link-${videoNum}`;
    console.log(`Navigating to video link page: ${videoLinkPageId} for video ${videoId}`);
    showPage(videoLinkPageId);
    
    logEvent('video_link_page_viewed', {
        video_id: videoId,
        participant_name: currentParticipant
    });
}

// Continue from video link page to reflection task
async function continueToReflectionTask(videoNum) {
    const videoId = `video${videoNum}`;
    const video = VIDEOS.find(v => v.id === videoId);
    
    if (!video) return;
    
    currentVideoId = videoId;
    const ids = getVideoElementIds(videoNum);
    
    // Update task page with video info
    const titleEl = document.getElementById(ids.title);
    const subtitleEl = document.getElementById(ids.subtitle);
    const codeEl = document.getElementById(ids.participantCode);
    const videoNameEl = document.getElementById(ids.videoName);
    
    const t = translations[currentLanguage];
    
    if (titleEl) {
        // Use consistent INFER Video Reflection Task title
        titleEl.setAttribute('data-lang-key', 'video_task_title');
        titleEl.textContent = t.video_task_title;
    }
    if (subtitleEl) {
        // Show different subtitle for reflection-only mode
        if (video.hasINFER) {
            subtitleEl.setAttribute('data-lang-key', 'video_task_subtitle');
            subtitleEl.textContent = t.video_task_subtitle;
        } else {
            subtitleEl.setAttribute('data-lang-key', 'reflection_only_mode');
            subtitleEl.textContent = t.reflection_only_mode || 'Write your reflection about the video. After submission, you will proceed to a short questionnaire.';
        }
    }
    if (codeEl) codeEl.value = currentParticipant;
    if (videoNameEl) videoNameEl.value = video.name;
    
    // Configure UI based on whether video has INFER feedback
    configureVideoTaskUI(videoNum, video.hasINFER);
    
    // Load previous reflection and feedback for this video
    await loadPreviousReflectionAndFeedbackForVideo(videoId, videoNum);
    
    // Gamma: Never show percentage explanation (no complex analysis in Gamma)
    const explanationEl = document.getElementById(ids.percentageExplanation);
    if (explanationEl) {
        explanationEl.classList.add('d-none'); // Always hide in Gamma
    }
    
    // Show task page for this video (use page-video-X format)
    const videoPageId = `video-${videoNum}`;
    console.log(`Navigating to video page: ${videoPageId} for video ${videoId} (hasINFER: ${video.hasINFER})`);
    showPage(videoPageId);
    
    logEvent('video_task_started', {
        video_id: videoId,
        participant_name: currentParticipant,
        has_infer: video.hasINFER
    });
}

// Configure UI for Gamma (Control Group): All videos have simple feedback
function configureVideoTaskUI(videoNum, hasINFER) {
    const ids = getVideoElementIds(videoNum);
    const t = translations[currentLanguage];
    
    const generateBtn = document.getElementById(ids.generateBtn);
    const submitBtn = document.getElementById(ids.submitBtn);
    const feedbackTabs = document.getElementById(ids.feedbackTabs);
    const feedbackSection = document.getElementById(`video-${videoNum}-feedback-section`);
    const reviseBtn = document.getElementById(ids.reviseBtn);
    const copyBtn = document.getElementById(ids.copyBtn);
    const conceptsSection = document.getElementById(`video-${videoNum}-concepts-section`);
    const percentageExplanation = document.getElementById(ids.percentageExplanation);
    
    // Gamma: Always hide percentage explanation (no complex analysis in Gamma)
    if (percentageExplanation) {
        percentageExplanation.classList.add('d-none');
    }
    
    // Gamma: All videos have simple feedback (hasINFER is true for all)
    if (hasINFER) {
        // Simple feedback mode: Show generate button and submit button
        if (generateBtn) {
            generateBtn.classList.remove('d-none');
            generateBtn.textContent = t.generate_feedback || 'Generate Feedback';
        }
        if (submitBtn) {
            submitBtn.classList.remove('d-none');
            submitBtn.disabled = false;
        }
        if (feedbackSection) feedbackSection.classList.remove('d-none');
        // Hide concepts section in Gamma (no complex analysis)
        if (conceptsSection) conceptsSection.classList.add('d-none');
    } else {
        // Reflection-only mode: Hide generate button, show submit directly
        if (generateBtn) {
            generateBtn.classList.add('d-none');
        }
        if (submitBtn) {
            submitBtn.classList.remove('d-none');
            submitBtn.textContent = t.submit_reflection_only || 'Submit Reflection';
            submitBtn.disabled = false;
        }
        // Hide feedback-related elements
        if (feedbackTabs) feedbackTabs.classList.add('d-none');
        if (feedbackSection) feedbackSection.classList.add('d-none');
        if (reviseBtn) reviseBtn.classList.add('d-none');
        if (copyBtn) copyBtn.classList.add('d-none');
        if (conceptsSection) conceptsSection.classList.add('d-none');
    }
}

// Load previous reflection and feedback for a specific video page
async function loadPreviousReflectionAndFeedbackForVideo(videoId, videoNum) {
    if (!supabase || !currentParticipant) {
        // No database, start fresh
        resetTaskStateForVideo(videoNum);
        return;
    }
    
    try {
        // Get the most recent reflection for this video and participant
        const { data: reflection, error } = await supabase
            .from('reflections')
            .select('*')
            .eq('participant_name', currentParticipant)
            .eq('video_id', videoId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(); // Use maybeSingle() instead of single() to handle empty results gracefully
        
        if (error) {
            console.error('Error loading previous reflection:', error);
            resetTaskStateForVideo(videoNum);
            return;
        }
        
        const ids = getVideoElementIds(videoNum);
        
        if (reflection) {
            // Check if video is already completed (submitted)
            const isVideoCompleted = currentParticipantProgress?.videos_completed?.includes(videoId) || false;
            
            // Load previous reflection text
            const reflectionText = document.getElementById(ids.reflectionText);
            if (reflectionText && reflection.reflection_text) {
                reflectionText.value = reflection.reflection_text;
                updateWordCountForVideo(videoNum);
                
                // Make read-only and disable all edit buttons if video is completed
                if (isVideoCompleted) {
                    reflectionText.readOnly = true;
                    reflectionText.style.backgroundColor = '#f5f5f5';
                    reflectionText.style.cursor = 'not-allowed';
                    
                    // Disable all edit buttons
                    const saveBtn = document.getElementById(ids.saveBtn);
                    const clearBtn = document.getElementById(ids.clearBtn);
                    const generateBtn = document.getElementById(ids.generateBtn);
                    const reviseBtn = document.getElementById(ids.reviseBtn);
                    const submitBtn = document.getElementById(ids.submitBtn);
                    
                    if (saveBtn) saveBtn.disabled = true;
                    if (clearBtn) clearBtn.disabled = true;
                    if (generateBtn) generateBtn.disabled = true;
                    if (reviseBtn) reviseBtn.disabled = true;
                    if (submitBtn) submitBtn.disabled = true;
                    
                    // Show a message that this video is completed
                    const completedMessage = currentLanguage === 'en' 
                        ? 'This video task has been completed and submitted. You can view your reflection and feedback, but cannot make further changes.'
                        : 'Diese Videoaufgabe wurde abgeschlossen und eingereicht. Sie können Ihre Reflexion und Ihr Feedback ansehen, aber keine weiteren Änderungen vornehmen.';
                    
                    // Add a notice above the reflection text area
                    const reflectionContainer = reflectionText.closest('.mb-3') || reflectionText.parentElement;
                    if (reflectionContainer) {
                        let noticeDiv = reflectionContainer.querySelector('.completed-notice');
                        if (!noticeDiv) {
                            noticeDiv = document.createElement('div');
                            noticeDiv.className = 'alert alert-info completed-notice mb-2';
                            noticeDiv.innerHTML = `<i class="bi bi-info-circle me-2"></i>${completedMessage}`;
                            reflectionContainer.insertBefore(noticeDiv, reflectionText);
                        }
                    }
                }
            }
            
            // Load previous feedback if available
            // BUT: Don't overwrite if we just generated new feedback
            if (!currentTaskState.justGeneratedFeedback && (reflection.feedback_extended || reflection.feedback_short)) {
                const feedbackExtended = document.getElementById(ids.feedbackExtended);
                const feedbackShort = document.getElementById(ids.feedbackShort);
                const feedbackTabs = document.getElementById(ids.feedbackTabs);
                const reviseBtn = document.getElementById(ids.reviseBtn);
                const submitBtn = document.getElementById(ids.submitBtn);
                const extendedPane = document.getElementById(`video-${videoNum}-feedback-extended-pane`);
                
                // Gamma: Use simple feedback display (no structured formatting)
                // Check if this is simple feedback (no analysis_percentages means it's Gamma simple feedback)
                const isSimpleFeedback = !reflection.analysis_percentages;
                
                // Ensure extended pane is visible when loading feedback
                if (extendedPane) {
                    extendedPane.classList.add('show', 'active');
                    extendedPane.classList.remove('fade');
                }
                
                if (reflection.feedback_extended && feedbackExtended) {
                    if (isSimpleFeedback) {
                        // Gamma simple feedback: display directly without formatting
                        const feedbackHTML = reflection.feedback_extended.replace(/\n/g, '<br>');
                        feedbackExtended.innerHTML = `<div class="feedback-content">${feedbackHTML}</div>`;
                        console.log('Gamma: Loaded simple feedback from database, length:', reflection.feedback_extended.length);
                        console.log('Gamma: Loaded feedback text:', reflection.feedback_extended);
                    } else {
                        // Structured feedback (shouldn't happen in Gamma, but handle for compatibility)
                        const analysisResult = reflection.analysis_percentages ? {
                            percentages_raw: reflection.analysis_percentages.raw || reflection.analysis_percentages,
                            percentages_priority: reflection.analysis_percentages.priority || reflection.analysis_percentages,
                            weakest_component: reflection.weakest_component || 'Prediction'
                        } : null;
                        feedbackExtended.innerHTML = formatStructuredFeedback(reflection.feedback_extended, analysisResult);
                    }
                }
                
                if (reflection.feedback_short && feedbackShort) {
                    if (isSimpleFeedback) {
                        // Gamma simple feedback: display directly without formatting
                        const feedbackHTML = reflection.feedback_short.replace(/\n/g, '<br>');
                        feedbackShort.innerHTML = `<div class="feedback-content">${feedbackHTML}</div>`;
                    } else {
                        // Structured feedback (shouldn't happen in Gamma, but handle for compatibility)
                        const analysisResult = reflection.analysis_percentages ? {
                            percentages_raw: reflection.analysis_percentages.raw || reflection.analysis_percentages,
                            percentages_priority: reflection.analysis_percentages.priority || reflection.analysis_percentages,
                            weakest_component: reflection.weakest_component || 'Prediction'
                        } : null;
                        feedbackShort.innerHTML = formatStructuredFeedback(reflection.feedback_short, analysisResult);
                    }
                }
                
                // Check if video is already completed (submitted) - check again here for button logic
                const isVideoCompleted = currentParticipantProgress?.videos_completed?.includes(videoId) || false;
                
                // Gamma: Hide tabs (same feedback for both)
                if (feedbackTabs) feedbackTabs.classList.add('d-none');
                
                // Only show revise/submit buttons if not completed
                if (!isVideoCompleted) {
                    if (reviseBtn) reviseBtn.style.display = 'inline-block';
                    if (submitBtn) submitBtn.style.display = 'block';
                } else {
                    // Hide edit buttons for completed videos
                    if (reviseBtn) reviseBtn.style.display = 'none';
                    if (submitBtn) submitBtn.style.display = 'none';
                    
                    // Disable generate button
                    const generateBtn = document.getElementById(ids.generateBtn);
                    if (generateBtn) generateBtn.disabled = true;
                    
                    // Disable clear button
                    const clearBtn = document.getElementById(ids.clearBtn);
                    if (clearBtn) clearBtn.disabled = true;
                }
                
                // Display analysis distribution if available
                if (reflection.analysis_percentages) {
                    const analysisResult = {
                        percentages_raw: reflection.analysis_percentages.raw || reflection.analysis_percentages,
                        percentages_priority: reflection.analysis_percentages.priority || reflection.analysis_percentages,
                        weakest_component: reflection.weakest_component || 'Prediction'
                    };
                    displayAnalysisDistributionForVideo(analysisResult, videoNum);
                }
                
                // Update task state
                currentTaskState = {
                    feedbackGenerated: true,
                    submitted: reflection.revision_number > 1,
                    currentReflectionId: reflection.id,
                    parentReflectionId: reflection.parent_reflection_id,
                    revisionCount: reflection.revision_number || 1,
                    currentFeedbackType: null,
                    currentFeedbackStartTime: null
                };
                
                // Store reflection for duplicate detection
                sessionStorage.setItem(`reflection-${videoId}`, reflection.reflection_text);
            } else {
                // No feedback yet, reset state
                resetTaskStateForVideo(videoNum);
            }
        } else {
            // No previous reflection, start fresh
            resetTaskStateForVideo(videoNum);
        }
    } catch (error) {
        console.error('Error in loadPreviousReflectionAndFeedbackForVideo:', error);
        resetTaskStateForVideo(videoNum);
    }
}

// Load previous reflection and feedback for a video (legacy function - kept for compatibility)
async function loadPreviousReflectionAndFeedback(videoId) {
    if (!supabase || !currentParticipant) {
        // No database, start fresh
        resetTaskState();
        return;
    }
    
    try {
        // Get the most recent reflection for this video and participant
        const { data: reflection, error } = await supabase
            .from('reflections')
            .select('*')
            .eq('participant_name', currentParticipant)
            .eq('video_id', videoId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(); // Use maybeSingle() to handle empty results gracefully
        
        if (error) {
            console.error('Error loading previous reflection:', error);
            resetTaskState();
            return;
        }
        
        if (reflection) {
            // Load previous reflection text
            const reflectionText = document.getElementById('task-reflection-text');
            if (reflectionText && reflection.reflection_text) {
                reflectionText.value = reflection.reflection_text;
                updateWordCount();
            }
            
            // Load previous feedback if available
            if (reflection.feedback_extended || reflection.feedback_short) {
                const ids = getVideoElementIds(videoNum);
                const feedbackExtended = document.getElementById(ids.feedbackExtended);
                const feedbackShort = document.getElementById(ids.feedbackShort);
                const feedbackTabs = document.getElementById(ids.feedbackTabs);
                const reviseBtn = document.getElementById(ids.reviseBtn);
                const submitBtn = document.getElementById(ids.submitBtn);
                
                // Gamma: Use simple feedback display (no structured formatting)
                // Check if this is simple feedback (no analysis_percentages means it's Gamma simple feedback)
                const isSimpleFeedback = !reflection.analysis_percentages;
                
                if (reflection.feedback_extended && feedbackExtended) {
                    if (isSimpleFeedback) {
                        // Gamma simple feedback: display directly without formatting
                        const feedbackHTML = reflection.feedback_extended.replace(/\n/g, '<br>');
                        feedbackExtended.innerHTML = `<div class="feedback-content">${feedbackHTML}</div>`;
                        console.log('Gamma: Loaded simple feedback (legacy), length:', reflection.feedback_extended.length);
                    } else {
                        // Structured feedback (shouldn't happen in Gamma, but handle for compatibility)
                        const analysisResult = reflection.analysis_percentages ? {
                            percentages_raw: reflection.analysis_percentages.raw || reflection.analysis_percentages,
                            percentages_priority: reflection.analysis_percentages.priority || reflection.analysis_percentages,
                            weakest_component: reflection.weakest_component || 'Prediction'
                        } : null;
                        feedbackExtended.innerHTML = formatStructuredFeedback(reflection.feedback_extended, analysisResult);
                    }
                }
                
                if (reflection.feedback_short && feedbackShort) {
                    if (isSimpleFeedback) {
                        // Gamma simple feedback: display directly without formatting
                        const feedbackHTML = reflection.feedback_short.replace(/\n/g, '<br>');
                        feedbackShort.innerHTML = `<div class="feedback-content">${feedbackHTML}</div>`;
                    } else {
                        // Structured feedback (shouldn't happen in Gamma, but handle for compatibility)
                        const analysisResult = reflection.analysis_percentages ? {
                            percentages_raw: reflection.analysis_percentages.raw || reflection.analysis_percentages,
                            percentages_priority: reflection.analysis_percentages.priority || reflection.analysis_percentages,
                            weakest_component: reflection.weakest_component || 'Prediction'
                        } : null;
                        feedbackShort.innerHTML = formatStructuredFeedback(reflection.feedback_short, analysisResult);
                    }
                }
                
                // Gamma: Hide tabs (same feedback for both)
                if (feedbackTabs) feedbackTabs.classList.add('d-none');
                if (reviseBtn) reviseBtn.style.display = 'inline-block';
                if (submitBtn) submitBtn.style.display = 'block';
                
                // Display analysis distribution if available
                if (reflection.analysis_percentages) {
                    const analysisResult = {
                        percentages_raw: reflection.analysis_percentages.raw || reflection.analysis_percentages,
                        percentages_priority: reflection.analysis_percentages.priority || reflection.analysis_percentages,
                        weakest_component: reflection.weakest_component || 'Prediction'
                    };
                    displayAnalysisDistribution(analysisResult);
                }
                
                // Update task state
                currentTaskState = {
                    feedbackGenerated: true,
                    submitted: reflection.revision_number > 1, // Consider submitted if multiple revisions
                    currentReflectionId: reflection.id,
                    parentReflectionId: reflection.parent_reflection_id,
                    revisionCount: reflection.revision_number || 1,
                    currentFeedbackType: null,
                    currentFeedbackStartTime: null
                };
                
                // Store reflection for duplicate detection
                sessionStorage.setItem(`reflection-${videoId}`, reflection.reflection_text);
            } else {
                // No feedback yet, reset state
                resetTaskState();
            }
        } else {
            // No previous reflection, start fresh
            resetTaskState();
        }
    } catch (error) {
        console.error('Error in loadPreviousReflectionAndFeedback:', error);
        resetTaskState();
    }
}

// Reset task state for a specific video page
function resetTaskStateForVideo(videoNum) {
    // Reset task state
    currentTaskState = {
        feedbackGenerated: false,
        submitted: false,
        currentReflectionId: null,
        parentReflectionId: null,
        revisionCount: 0,
        currentFeedbackType: null,
        currentFeedbackStartTime: null
    };
    
    // Reset AI usage flag for new video task
    hasAskedAboutAI = false;
    
    const ids = getVideoElementIds(videoNum);
    
    // Clear reflection text
    const reflectionText = document.getElementById(ids.reflectionText);
    if (reflectionText) reflectionText.value = '';
    updateWordCountForVideo(videoNum);
    
    // Clear all feedback displays
    const feedbackExtended = document.getElementById(ids.feedbackExtended);
    const feedbackShort = document.getElementById(ids.feedbackShort);
    const feedbackTabs = document.getElementById(ids.feedbackTabs);
    const reviseBtn = document.getElementById(ids.reviseBtn);
    const submitBtn = document.getElementById(ids.submitBtn);
    
    if (feedbackExtended) feedbackExtended.innerHTML = '<p class="text-muted" data-lang-key="feedback_placeholder">Feedback will appear here after generation...</p>';
    if (feedbackShort) feedbackShort.innerHTML = '<p class="text-muted" data-lang-key="feedback_placeholder">Feedback will appear here after generation...</p>';
    if (feedbackTabs) feedbackTabs.classList.add('d-none');
    
    // Remove analysis distribution if exists
    const analysisDist = document.getElementById(`analysis-distribution-video-${videoNum}`);
    if (analysisDist) analysisDist.remove();
    
    if (reviseBtn) reviseBtn.style.display = 'none';
}

// Reset task state (legacy function - kept for compatibility)
function resetTaskState() {
    // This is a fallback - try to detect current video page
    const currentVideoPage = document.querySelector('.video-task-page:not(.d-none)');
    if (currentVideoPage) {
        const videoId = currentVideoPage.dataset.videoId;
        const videoNum = getVideoPageNumber(videoId);
        resetTaskStateForVideo(videoNum);
    }
}

// Update progress bar
function updateProgressBar() {
    if (!currentParticipantProgress) return;
    
    const videosDone = currentParticipantProgress.videos_completed?.length || 0;
    const progress = (videosDone / 4) * 100;
    
    const progressBar = document.getElementById('dashboard-progress-bar');
    const progressText = document.getElementById('dashboard-progress-text');
    
    if (progressBar) {
        progressBar.style.width = progress + '%';
        progressBar.setAttribute('aria-valuenow', progress);
    }
    
    if (progressText) {
        progressText.textContent = `${videosDone}/4 Videos Completed`;
    }
}

// Load survey iframe
function loadSurvey(surveyType) {
    let surveyUrl = '';
    
    if (surveyType === 'pre') {
        surveyUrl = QUALTRICS_SURVEYS.pre;
        document.getElementById('pre-survey-iframe').src = surveyUrl;
    } else if (surveyType === 'post') {
        surveyUrl = QUALTRICS_SURVEYS.post;
        document.getElementById('post-survey-iframe').src = surveyUrl;
    } else if (surveyType.startsWith('post_video_')) {
        const videoNum = surveyType.split('_')[2];
        surveyUrl = QUALTRICS_SURVEYS[`post_video_${videoNum}`];
        const iframeId = `post-video-survey-${videoNum}-iframe`;
        const iframe = document.getElementById(iframeId);
        if (iframe) {
            iframe.src = surveyUrl;
        }
        
        // Checkbox starts unchecked - user must manually check it
        const checkbox = document.getElementById(`survey-completed-check-${videoNum}`);
        if (checkbox) {
            checkbox.checked = false;
        }
    } else if (surveyType === 'post') {
        // Checkbox starts unchecked - user must manually check it
        const checkbox = document.getElementById('final-survey-completed-check');
        if (checkbox) {
            checkbox.checked = false;
        }
    }
}

// Update pre-survey page based on completion status
function updatePreSurveyPage() {
    const isCompleted = currentParticipantProgress?.pre_survey_completed || false;
    const completedStatus = document.getElementById('presurvey-completed-status');
    const description = document.getElementById('presurvey-description');
    const instructions = document.getElementById('presurvey-instructions');
    const continueBtn = document.getElementById('continue-after-presurvey');
    const checkbox = document.getElementById('presurvey-completed-check');
    
    // Checkbox starts unchecked - user must manually check it
    if (checkbox) {
        checkbox.checked = false;
    }
    
    if (isCompleted) {
        // Show completion status
        if (completedStatus) {
            completedStatus.classList.remove('d-none');
        }
        if (description) {
            description.textContent = currentLanguage === 'en' 
                ? 'You have already completed this survey. You can review it below or return to the dashboard.'
                : 'Sie haben diese Umfrage bereits abgeschlossen. Sie können sie unten überprüfen oder zum Dashboard zurückkehren.';
        }
        if (instructions) {
            instructions.innerHTML = currentLanguage === 'en'
                ? '<small><i class="bi bi-info-circle me-1"></i><strong>Status:</strong> <span>Pre-survey completed. You can review it above or return to the dashboard.</span></small>'
                : '<small><i class="bi bi-info-circle me-1"></i><strong>Status:</strong> <span>Vor-Umfrage abgeschlossen. Sie können sie oben überprüfen oder zum Dashboard zurückkehren.</span></small>';
            instructions.className = 'alert alert-info mt-3 mb-0';
        }
        if (continueBtn) {
            continueBtn.textContent = currentLanguage === 'en' ? 'Return to Dashboard' : 'Zum Dashboard zurückkehren';
        }
    } else {
        // Hide completion status
        if (completedStatus) {
            completedStatus.classList.add('d-none');
        }
        if (instructions) {
            instructions.className = 'alert alert-success mt-3 mb-0';
        }
    }
}

// Mark pre-survey complete
async function markPreSurveyComplete() {
    if (!supabase || !currentParticipant) return;
    
    try {
        const { error } = await supabase
            .from('participant_progress')
            .update({ 
                pre_survey_completed: true,
                last_active_at: new Date().toISOString()
            })
            .eq('participant_name', currentParticipant);
        
        if (error) console.error('Error marking pre-survey complete:', error);
        else {
            currentParticipantProgress.pre_survey_completed = true;
            updatePreSurveyStatus(); // Update dashboard status
            logEvent('pre_survey_completed', { 
                participant_name: currentParticipant,
                language: currentLanguage
            });
        }
    } catch (error) {
        console.error('Error in markPreSurveyComplete:', error);
    }
}

// Mark video survey complete
async function markVideoSurveyComplete() {
    if (!supabase || !currentParticipant || !currentVideoId) return;
    
    try {
        const videoSurveys = currentParticipantProgress.video_surveys || {};
        videoSurveys[currentVideoId] = true;
        
        const { error } = await supabase
            .from('participant_progress')
            .update({ 
                video_surveys: videoSurveys,
                last_active_at: new Date().toISOString()
            })
            .eq('participant_name', currentParticipant);
        
        if (error) console.error('Error marking video survey complete:', error);
        else {
            currentParticipantProgress.video_surveys = videoSurveys;
            logEvent('video_survey_completed', { 
                participant_name: currentParticipant,
                video_id: currentVideoId
            });
        }
    } catch (error) {
        console.error('Error in markVideoSurveyComplete:', error);
    }
}

// Mark post-survey complete
async function markPostSurveyComplete() {
    if (!supabase || !currentParticipant) return;
    
    try {
        const { error } = await supabase
            .from('participant_progress')
            .update({ 
                post_survey_completed: true,
                last_active_at: new Date().toISOString()
            })
            .eq('participant_name', currentParticipant);
        
        if (error) console.error('Error marking post-survey complete:', error);
        else {
            currentParticipantProgress.post_survey_completed = true;
            logEvent('post_survey_completed', { 
                participant_name: currentParticipant,
                language: currentLanguage
            });
        }
    } catch (error) {
        console.error('Error in markPostSurveyComplete:', error);
    }
}

// Word count for specific video page
function updateWordCountForVideo(videoNum) {
    const ids = getVideoElementIds(videoNum);
    const text = document.getElementById(ids.reflectionText)?.value.trim() || '';
    const words = text ? text.split(/\s+/).length : 0;
    const wordCountEl = document.getElementById(ids.wordCount);
    if (wordCountEl) wordCountEl.textContent = words;
}

// Word count (legacy - kept for compatibility)
function updateWordCount() {
    // Try to detect current video page
    const currentVideoPage = document.querySelector('.video-task-page:not(.d-none)');
    if (currentVideoPage) {
        const videoId = currentVideoPage.dataset.videoId;
        const videoNum = getVideoPageNumber(videoId);
        updateWordCountForVideo(videoNum);
    }
}

// Generate feedback handler for specific video
async function handleGenerateFeedbackForVideo(videoNum) {
    const ids = getVideoElementIds(videoNum);
    const reflection = document.getElementById(ids.reflectionText)?.value.trim();
    
    if (!reflection) {
        const t = translations[currentLanguage];
        showAlert(t.enter_reflection_first || 'Please enter a reflection text first.', 'warning');
        return;
    }
    
    // Gamma (Control Group): Use simple feedback generation (no preference modal, no complex analysis)
    generateSimpleFeedbackForVideo(reflection, videoNum);
}

// Generate feedback handler (legacy - kept for compatibility)
async function handleGenerateFeedback() {
    // Try to detect current video page
    const currentVideoPage = document.querySelector('.video-task-page:not(.d-none)');
    if (currentVideoPage) {
        const videoId = currentVideoPage.dataset.videoId;
        const videoNum = getVideoPageNumber(videoId);
        handleGenerateFeedbackForVideo(videoNum);
    }
}

// Generate feedback for specific video page
// Generate simple feedback for Gamma (Control Group) - no complex analysis
async function generateSimpleFeedbackForVideo(reflection, videoNum) {
    const ids = getVideoElementIds(videoNum);
    const generateBtn = document.getElementById(ids.generateBtn);
    const loadingSpinner = document.getElementById(ids.loadingSpinner);
    const loadingText = document.getElementById(ids.loadingText);
    
    // Show loading
    if (loadingSpinner) loadingSpinner.style.display = 'flex';
    if (generateBtn) generateBtn.disabled = true;
    
    // Rotate loading messages (same as Alpha/Beta)
    let loadingMessageIndex = 0;
    const loadingInterval = setInterval(() => {
        loadingMessageIndex = (loadingMessageIndex + 1) % translations[currentLanguage].loading_messages.length;
        if (loadingText) {
            loadingText.textContent = translations[currentLanguage].loading_messages[loadingMessageIndex];
            loadingText.style.display = 'block'; // Ensure loading text is visible
        }
    }, 8000);
    
    try {
        // Step 0: Check for duplicate reflection
        const previousReflection = sessionStorage.getItem(`reflection-${currentVideoId}`);
        if (previousReflection && previousReflection.trim() === reflection.trim()) {
            const duplicateMessage = currentLanguage === 'en'
                ? "⚠️ You submitted the same reflection as before. Please revise your reflection to improve it based on the previous feedback, then generate new feedback."
                : "⚠️ Sie haben dieselbe Reflexion wie zuvor eingereicht. Bitte überarbeiten Sie Ihre Reflexion, um sie basierend auf dem vorherigen Feedback zu verbessern, und generieren Sie dann neues Feedback.";
            
            logEvent('duplicate_reflection_detected', {
                participant_name: currentParticipant,
                video_id: currentVideoId,
                language: currentLanguage,
                reflection_length: reflection.length,
                revision_count: currentTaskState.revisionCount || 0
            });
            
            clearInterval(loadingInterval);
            if (loadingSpinner) loadingSpinner.style.display = 'none';
            if (loadingText) loadingText.style.display = 'none';
            if (generateBtn) generateBtn.disabled = false;
            
            showAlert(duplicateMessage, 'warning');
            return;
        }
        
        // Step 0.5: Check for very short reflection
        const wordCount = reflection.split(/\s+/).length;
        const isVeryShort = wordCount < 20;
        
        if (isVeryShort) {
            const warningMessage = currentLanguage === 'en'
                ? "⚠️ Your reflection is very short (only " + wordCount + " words). Please expand your reflection to at least 50 words, providing more detail about what you observed, why it happened, and its effects on student learning."
                : "⚠️ Ihre Reflexion ist sehr kurz (nur " + wordCount + " Wörter). Bitte erweitern Sie Ihre Reflexion auf mindestens 50 Wörter und geben Sie mehr Details zu dem, was Sie beobachtet haben, warum es passiert ist und welche Auswirkungen es auf das Lernen der Schüler hat.";
            
            logEvent('very_short_reflection_detected', {
                participant_name: currentParticipant,
                video_id: currentVideoId,
                language: currentLanguage,
                word_count: wordCount,
                is_very_short: isVeryShort
            });
            
            clearInterval(loadingInterval);
            if (loadingSpinner) loadingSpinner.style.display = 'none';
            if (loadingText) loadingText.style.display = 'none';
            if (generateBtn) generateBtn.disabled = false;
            
            showAlert(warningMessage, 'warning');
            return;
        }
        
        // Step 0.6: Check for irrelevant content (simple check - look for common irrelevant words)
        const irrelevantPatterns = currentLanguage === 'en' 
            ? /\b(test|testing|hello|hi|asdf|qwerty|123|abc|xyz|lorem|ipsum)\b/gi
            : /\b(test|testen|hallo|hi|asdf|qwerty|123|abc|xyz|lorem|ipsum)\b/gi;
        
        const hasIrrelevantContent = irrelevantPatterns.test(reflection);
        if (hasIrrelevantContent && reflection.length < 100) {
            const warningMessage = currentLanguage === 'en'
                ? "⚠️ Your reflection does not relate to the teaching video. Please write a reflection about what you observed in the video."
                : "⚠️ Ihre Reflexion bezieht sich nicht auf das Unterrichtsvideo. Bitte schreiben Sie eine Reflexion über das, was Sie im Video beobachtet haben.";
            
            logEvent('irrelevant_reflection_detected', {
                participant_name: currentParticipant,
                video_id: currentVideoId,
                language: currentLanguage,
                reflection_length: reflection.length
            });
            
            clearInterval(loadingInterval);
            if (loadingSpinner) loadingSpinner.style.display = 'none';
            if (loadingText) loadingText.style.display = 'none';
            if (generateBtn) generateBtn.disabled = false;
            
            showAlert(warningMessage, 'warning');
            return;
        }
        
        // Gamma: Simple feedback generation without complex analysis
        const simpleFeedback = await generateSimpleFeedback(reflection, currentLanguage);
        
        // Log the full feedback to console for debugging
        console.log('Gamma: Full feedback received from API:', simpleFeedback);
        console.log('Gamma: Feedback length:', simpleFeedback.length, 'characters');
        
        // Display feedback (same format for both extended and short in Gamma)
        const feedbackExtended = document.getElementById(ids.feedbackExtended);
        const feedbackShort = document.getElementById(ids.feedbackShort);
        const feedbackTabs = document.getElementById(ids.feedbackTabs);
        const extendedPane = document.getElementById(`video-${videoNum}-feedback-extended-pane`);
        const shortPane = document.getElementById(`video-${videoNum}-feedback-short-pane`);
        
        // Ensure we're displaying the full feedback - use textContent to preserve all content
        const feedbackHTML = simpleFeedback.replace(/\n/g, '<br>');
        
        // Log detailed information
        console.log('Gamma: Setting feedback...');
        console.log('Gamma: Full feedback text:', simpleFeedback);
        console.log('Gamma: FeedbackExtended element:', feedbackExtended);
        console.log('Gamma: FeedbackShort element:', feedbackShort);
        console.log('Gamma: Extended pane:', extendedPane);
        console.log('Gamma: Short pane:', shortPane);
        
        // Ensure extended pane is visible (show active)
        if (extendedPane) {
            extendedPane.classList.add('show', 'active');
            extendedPane.classList.remove('fade');
            console.log('Gamma: Extended pane classes:', extendedPane.className);
        }
        if (shortPane) {
            shortPane.classList.remove('show', 'active');
        }
        
        if (feedbackExtended) {
            feedbackExtended.innerHTML = `<div class="feedback-content">${feedbackHTML}</div>`;
            const displayedText = feedbackExtended.textContent || feedbackExtended.innerText;
            console.log('Gamma: Feedback set to feedbackExtended element');
            console.log('Gamma: Displayed text length:', displayedText.length);
            console.log('Gamma: Displayed text (first 200 chars):', displayedText.substring(0, 200));
            console.log('Gamma: Full displayed text:', displayedText);
            
            // Verify the content is actually there
            setTimeout(() => {
                const verifyText = feedbackExtended.textContent || feedbackExtended.innerText;
                console.log('Gamma: Verification after 100ms - text length:', verifyText.length);
                console.log('Gamma: Verification - full text:', verifyText);
            }, 100);
        }
        if (feedbackShort) {
            feedbackShort.innerHTML = `<div class="feedback-content">${feedbackHTML}</div>`;
            console.log('Gamma: Feedback set to feedbackShort element, length:', feedbackShort.textContent.length);
        }
        if (feedbackTabs) feedbackTabs.classList.add('d-none'); // Hide tabs in Gamma (same feedback for both)
        
        // Save feedback to database
        if (supabase && currentParticipant && currentVideoId) {
            try {
                const revisionNumber = currentTaskState.revisionCount || 1;
                const parentReflectionId = currentTaskState.parentReflectionId || null;
                
                let revisionTimeSeconds = null;
                if (revisionNumber > 1 && currentTaskState.lastRevisionTime) {
                    revisionTimeSeconds = (Date.now() - currentTaskState.lastRevisionTime) / 1000;
                }
                
                const reflectionData = {
                    session_id: currentSessionId,
                    participant_name: currentParticipant,
                    video_id: currentVideoId,
                    language: currentLanguage,
                    task_id: `video-task-${currentVideoId}`,
                    reflection_text: reflection,
                    feedback_extended: simpleFeedback, // Save the full feedback
                    feedback_short: simpleFeedback,   // Same for short (Gamma uses same feedback)
                    // Note: feedback_raw column may not exist in schema, so we store it in feedback_extended
                    revision_number: revisionNumber,
                    parent_reflection_id: parentReflectionId,
                    revision_time_seconds: revisionTimeSeconds,
                    created_at: new Date().toISOString()
                };
                
                const { data: result, error } = await supabase
                    .from('reflections')
                    .insert([reflectionData])
                    .select()
                    .single();
                
                if (error) {
                    console.error('Gamma: Error saving feedback to database:', error);
                } else {
                    console.log('Gamma: Feedback saved to database successfully');
                    currentTaskState.currentReflectionId = result.id;
                    if (revisionNumber === 1) {
                        currentTaskState.parentReflectionId = result.id;
                    }
                }
            } catch (dbError) {
                console.error('Gamma: Error in saveFeedbackToDatabase:', dbError);
            }
        }
        
        // Step 7: Store reflection for duplicate detection
        sessionStorage.setItem(`reflection-${currentVideoId}`, reflection.trim());
        
        // Mark that we just generated new feedback to prevent it from being overwritten
        currentTaskState.feedbackGenerated = true;
        currentTaskState.justGeneratedFeedback = true; // Flag to prevent overwriting
        
        clearInterval(loadingInterval);
        if (loadingSpinner) loadingSpinner.style.display = 'none';
        if (loadingText) loadingText.style.display = 'none'; // Hide loading text when done
        if (generateBtn) generateBtn.disabled = false;
        
        // Final verification - check what's actually visible in the UI
        setTimeout(() => {
            const finalCheckExtended = document.getElementById(ids.feedbackExtended);
            if (finalCheckExtended) {
                const finalText = finalCheckExtended.textContent || finalCheckExtended.innerText;
                console.log('Gamma: FINAL CHECK - Extended element text length:', finalText.length);
                console.log('Gamma: FINAL CHECK - Extended element full text:', finalText);
                console.log('Gamma: FINAL CHECK - Extended element innerHTML length:', finalCheckExtended.innerHTML.length);
                
                // Compare with what we set
                if (finalText.length !== simpleFeedback.length) {
                    console.warn('Gamma: WARNING - Feedback length mismatch! Expected:', simpleFeedback.length, 'Got:', finalText.length);
                    console.warn('Gamma: Expected text:', simpleFeedback);
                    console.warn('Gamma: Actual text:', finalText);
                    
                    // Restore the correct feedback if it was overwritten
                    const feedbackHTML = simpleFeedback.replace(/\n/g, '<br>');
                    finalCheckExtended.innerHTML = `<div class="feedback-content">${feedbackHTML}</div>`;
                    console.log('Gamma: Restored correct feedback');
                }
                
                // Also check if the pane is visible
                const finalPane = document.getElementById(`video-${videoNum}-feedback-extended-pane`);
                if (finalPane) {
                    const isVisible = finalPane.classList.contains('show') && finalPane.classList.contains('active');
                    console.log('Gamma: FINAL CHECK - Extended pane visible:', isVisible);
                    console.log('Gamma: FINAL CHECK - Extended pane classes:', finalPane.className);
                    console.log('Gamma: FINAL CHECK - Extended pane computed display:', window.getComputedStyle(finalPane).display);
                    
                    // Force visibility if needed
                    if (!isVisible) {
                        finalPane.classList.add('show', 'active');
                        finalPane.classList.remove('fade');
                        console.log('Gamma: Forced extended pane to be visible');
                    }
                }
            }
        }, 500);
        
        // Clear the flag after a delay to allow normal loading behavior later
        setTimeout(() => {
            currentTaskState.justGeneratedFeedback = false;
        }, 2000);
        
        logEvent('simple_feedback_generated', {
            video_id: `video${videoNum}`,
            participant_name: currentParticipant,
            language: currentLanguage,
            feedback_length: simpleFeedback.length
        });
    } catch (error) {
        console.error('Gamma: Error generating simple feedback:', error);
        console.error('Gamma: Error details:', {
            message: error.message,
            stack: error.stack,
            apiUrl: OPENAI_API_URL,
            corsProxy: CORS_PROXY_URL
        });
        clearInterval(loadingInterval);
        if (loadingSpinner) loadingSpinner.style.display = 'none';
        if (loadingText) loadingText.style.display = 'none'; // Hide loading text on error
        if (generateBtn) generateBtn.disabled = false;
        const errorMessage = currentLanguage === 'en' 
            ? `Error generating feedback: ${error.message}. Please check the console for details.`
            : `Fehler beim Generieren des Feedbacks: ${error.message}. Bitte überprüfen Sie die Konsole für Details.`;
        showAlert(errorMessage, 'danger');
    }
}

async function generateFeedbackForVideo(reflection, videoNum) {
    const ids = getVideoElementIds(videoNum);
    const loadingSpinner = document.getElementById(ids.loadingSpinner);
    const generateBtn = document.getElementById(ids.generateBtn);
    
    // Show loading
    if (loadingSpinner) loadingSpinner.style.display = 'flex';
    if (generateBtn) generateBtn.disabled = true;
    
    // Rotate loading messages
    const loadingText = document.getElementById(ids.loadingText);
    let loadingMessageIndex = 0;
    const loadingInterval = setInterval(() => {
        loadingMessageIndex = (loadingMessageIndex + 1) % translations[currentLanguage].loading_messages.length;
        if (loadingText) {
            loadingText.textContent = translations[currentLanguage].loading_messages[loadingMessageIndex];
        }
    }, 8000);
    
    try {
        // Step 0: Check for duplicate reflection
        const previousReflection = sessionStorage.getItem(`reflection-${currentVideoId}`);
        if (previousReflection && previousReflection.trim() === reflection.trim()) {
            const duplicateMessage = currentLanguage === 'en'
                ? "⚠️ You submitted the same reflection as before. Please revise your reflection to improve it based on the previous feedback, then generate new feedback."
                : "⚠️ Sie haben dieselbe Reflexion wie zuvor eingereicht. Bitte überarbeiten Sie Ihre Reflexion, um sie basierend auf dem vorherigen Feedback zu verbessern, und generieren Sie dann neues Feedback.";
            
            logEvent('duplicate_reflection_detected', {
                participant_name: currentParticipant,
                video_id: currentVideoId,
                language: currentLanguage,
                reflection_length: reflection.length,
                revision_count: currentTaskState.revisionCount || 0
            });
            
            clearInterval(loadingInterval);
            if (loadingSpinner) loadingSpinner.style.display = 'none';
            if (generateBtn) generateBtn.disabled = false;
            
            showAlert(duplicateMessage, 'warning');
            return;
        }
        
        // Step 0.5: Check for very short or non-relevant reflection
        const wordCount = reflection.split(/\s+/).length;
        const isVeryShort = wordCount < 20;
        
        // Step 1: Analyze reflection (binary classification at window level, then aggregated)
        const analysisResult = await analyzeReflectionDistribution(reflection, currentLanguage);
        
        // Store binary classification results (window-level D/E/P scores)
        await storeBinaryClassificationResults(analysisResult);
        
        // Step 2: Check for non-meaningful input (short OR non-relevant)
        const isNonRelevant = analysisResult.percentages_priority.professional_vision < 10;
        
        if (isVeryShort || isNonRelevant) {
            displayAnalysisDistributionForVideo(analysisResult, videoNum);
            
            let warningMessage = '';
            if (isVeryShort && isNonRelevant) {
                warningMessage = currentLanguage === 'en'
                    ? "⚠️ Your reflection is very short and does not relate to the teaching video. Please write a longer reflection (at least 50 words) that describes what you observed, explains why it happened using educational theories, and predicts the effects on student learning."
                    : "⚠️ Ihre Reflexion ist sehr kurz und bezieht sich nicht auf das Unterrichtsvideo. Bitte schreiben Sie eine längere Reflexion (mindestens 50 Wörter), die beschreibt, was Sie beobachtet haben, erklärt, warum es passiert ist (unter Verwendung pädagogischer Theorien), und die Auswirkungen auf das Lernen der Schüler vorhersagt.";
            } else if (isVeryShort) {
                warningMessage = currentLanguage === 'en'
                    ? "⚠️ Your reflection is very short (only " + wordCount + " words). Please expand your reflection to at least 50 words, providing more detail about what you observed, why it happened, and its effects on student learning."
                    : "⚠️ Ihre Reflexion ist sehr kurz (nur " + wordCount + " Wörter). Bitte erweitern Sie Ihre Reflexion auf mindestens 50 Wörter und geben Sie mehr Details zu dem, was Sie beobachtet haben, warum es passiert ist und welche Auswirkungen es auf das Lernen der Schüler hat.";
            } else {
                warningMessage = currentLanguage === 'en'
                    ? "⚠️ Your reflection does not relate to the teaching video you watched. Please revise your reflection to focus on describing what you observed, explaining why it happened using educational theories, and predicting the effects on student learning."
                    : "⚠️ Ihre Reflexion bezieht sich nicht auf das Unterrichtsvideo, das Sie sich angeschaut haben. Bitte überarbeiten Sie Ihre Reflexion, um sich auf die Beschreibung Ihrer Beobachtungen, die Erklärung mit Hilfe pädagogischer Theorien und die Vorhersage der Auswirkungen auf das Lernen der Schüler zu konzentrieren.";
            }
            
            logEvent('non_relevant_reflection_detected', {
                participant_name: currentParticipant,
                video_id: currentVideoId,
                language: currentLanguage,
                reflection_length: reflection.length,
                word_count: wordCount,
                professional_vision_percentage: analysisResult.percentages_priority.professional_vision,
                is_very_short: isVeryShort,
                is_non_relevant: isNonRelevant
            });
            
            const feedbackExtended = document.getElementById(ids.feedbackExtended);
            const feedbackShort = document.getElementById(ids.feedbackShort);
            if (feedbackExtended) feedbackExtended.innerHTML = `<div class="alert alert-warning"><i class="bi bi-exclamation-triangle me-2"></i>${warningMessage}</div>`;
            if (feedbackShort) feedbackShort.innerHTML = `<div class="alert alert-warning"><i class="bi bi-exclamation-triangle me-2"></i>${warningMessage}</div>`;
            
            const feedbackTabs = document.getElementById(ids.feedbackTabs);
            if (feedbackTabs) feedbackTabs.classList.remove('d-none');
            
            clearInterval(loadingInterval);
            if (loadingSpinner) loadingSpinner.style.display = 'none';
            if (generateBtn) generateBtn.disabled = false;
            return;
        }
        
        // Step 3: Display analysis distribution
        displayAnalysisDistributionForVideo(analysisResult, videoNum);
        
        // Step 4: Generate both feedback styles
        const [extendedFeedback, shortFeedback] = await Promise.all([
            generateWeightedFeedback(reflection, currentLanguage, 'academic', analysisResult),
            generateWeightedFeedback(reflection, currentLanguage, 'user-friendly', analysisResult)
        ]);
        
        // Step 5: Add revision suggestion if needed (for non-relevant content)
        let finalShortFeedback = shortFeedback;
        let finalExtendedFeedback = extendedFeedback;
        
        // Add warning if significant non-relevant content
        if (analysisResult && analysisResult.percentages_priority.other > 50) {
            const revisionNote = currentLanguage === 'en' 
                ? "\n\n**⚠️ Important Note:** Your reflection contains a significant amount of content that doesn't follow professional lesson analysis steps. Please revise your reflection to focus more on describing what you observed, explaining why it happened using educational theories, and predicting the effects on student learning."
                : "\n\n**⚠️ Wichtiger Hinweis:** Ihre Reflexion enthält einen erheblichen Anteil an Inhalten, die nicht den Schritten einer professionellen Stundenanalyse folgen. Bitte überarbeiten Sie Ihre Reflexion, um sich mehr auf die Beschreibung Ihrer Beobachtungen, die Erklärung mit Hilfe pädagogischer Theorien und die Vorhersage der Auswirkungen auf das Lernen der Schüler zu konzentrieren.";
            finalShortFeedback += revisionNote;
            finalExtendedFeedback += revisionNote;
            
            logEvent('non_relevant_content_warning', {
                participant_name: currentParticipant,
                video_id: currentVideoId,
                language: currentLanguage,
                other_percentage: analysisResult.percentages_priority.other,
                professional_vision_percentage: analysisResult.percentages_priority.professional_vision
            });
        }
        
        // Add warning if professional vision is low but above threshold
        if (analysisResult && analysisResult.percentages_priority.professional_vision < 30 && analysisResult.percentages_priority.professional_vision >= 10) {
            const lowPVNote = currentLanguage === 'en'
                ? "\n\n**Note:** Your reflection shows limited connection to professional vision concepts. Try to include more descriptions of observable teaching events, explanations linking events to educational theories, and predictions about effects on student learning."
                : "\n\n**Hinweis:** Ihre Reflexion zeigt eine begrenzte Verbindung zu Professional-Vision-Konzepten. Versuchen Sie, mehr Beschreibungen beobachtbarer Unterrichtsereignisse, Erklärungen, die Ereignisse mit pädagogischen Theorien verknüpfen, und Vorhersagen über Auswirkungen auf das Lernen der Schüler einzubeziehen.";
            finalShortFeedback += lowPVNote;
            finalExtendedFeedback += lowPVNote;
        }
        
        // Step 6: Save to database
        await saveFeedbackToDatabase({
            participantCode: currentParticipant,
            videoSelected: currentVideoId,
            reflectionText: reflection,
            analysisResult,
            extendedFeedback: finalExtendedFeedback,
            shortFeedback: finalShortFeedback
        });
        
        // Step 7: Store reflection for duplicate detection
        sessionStorage.setItem(`reflection-${currentVideoId}`, reflection.trim());
        
        // Step 8: Display feedback
        const feedbackExtended = document.getElementById(ids.feedbackExtended);
        const feedbackShort = document.getElementById(ids.feedbackShort);
        if (feedbackExtended) feedbackExtended.innerHTML = formatStructuredFeedback(finalExtendedFeedback, analysisResult);
        if (feedbackShort) feedbackShort.innerHTML = formatStructuredFeedback(finalShortFeedback, analysisResult);
        
        // Step 9: Show tabs
        const feedbackTabs = document.getElementById(ids.feedbackTabs);
        if (feedbackTabs) feedbackTabs.classList.remove('d-none');
        
        if (userPreferredFeedbackStyle === 'short') {
            document.getElementById(ids.shortTab)?.click();
        } else {
            document.getElementById(ids.extendedTab)?.click();
        }
        
        // Start feedback viewing tracking
        startFeedbackViewing(userPreferredFeedbackStyle, currentLanguage);
        
        // Step 10: Show revise and submit buttons
        const reviseBtn = document.getElementById(ids.reviseBtn);
        const submitBtn = document.getElementById(ids.submitBtn);
        if (reviseBtn) reviseBtn.classList.remove('d-none');
        if (submitBtn) {
            submitBtn.classList.remove('d-none');
            submitBtn.disabled = false;
        }
        
        currentTaskState.feedbackGenerated = true;
        
        // Log successful feedback generation
        logEvent('feedback_generated_successfully', {
            participant_name: currentParticipant,
            video_id: currentVideoId,
            language: currentLanguage,
            reflection_length: reflection.length,
            word_count: wordCount,
            professional_vision_percentage: analysisResult.percentages_priority.professional_vision,
            other_percentage: analysisResult.percentages_priority.other,
            revision_count: currentTaskState.revisionCount || 0
        });
        
        showAlert('✅ Feedback generated successfully!', 'success');
        
    } catch (error) {
        console.error('Error generating feedback:', error);
        showAlert(`⚠️ ${error.message}`, 'danger');
    } finally {
        clearInterval(loadingInterval);
        if (loadingSpinner) loadingSpinner.style.display = 'none';
        if (generateBtn) generateBtn.disabled = false;
    }
}

// Generate feedback (core logic - same as original)
async function generateFeedback(reflection) {
    const loadingSpinner = document.getElementById('task-loading-spinner');
    const generateBtn = document.getElementById('task-generate-btn');
    
    // Show loading
    if (loadingSpinner) loadingSpinner.style.display = 'flex';
    if (generateBtn) generateBtn.disabled = true;
    
    // Rotate loading messages
    const loadingText = document.getElementById('task-loading-text');
    let loadingMessageIndex = 0;
    const loadingInterval = setInterval(() => {
        loadingMessageIndex = (loadingMessageIndex + 1) % translations[currentLanguage].loading_messages.length;
        if (loadingText) {
            loadingText.textContent = translations[currentLanguage].loading_messages[loadingMessageIndex];
        }
    }, 8000);
    
    try {
        // Step 0: Check for duplicate reflection
        const previousReflection = sessionStorage.getItem(`reflection-${currentVideoId}`);
        if (previousReflection && previousReflection.trim() === reflection.trim()) {
            const duplicateMessage = currentLanguage === 'en'
                ? "⚠️ You submitted the same reflection as before. Please revise your reflection to improve it based on the previous feedback, then generate new feedback."
                : "⚠️ Sie haben dieselbe Reflexion wie zuvor eingereicht. Bitte überarbeiten Sie Ihre Reflexion, um sie basierend auf dem vorherigen Feedback zu verbessern, und generieren Sie dann neues Feedback.";
            
            logEvent('duplicate_reflection_detected', {
                participant_name: currentParticipant,
                video_id: currentVideoId,
                language: currentLanguage,
                reflection_length: reflection.length,
                revision_count: currentTaskState.revisionCount || 0
            });
            
            clearInterval(loadingInterval);
            if (loadingSpinner) loadingSpinner.style.display = 'none';
            if (generateBtn) generateBtn.disabled = false;
            
            showAlert(duplicateMessage, 'warning');
            return;
        }
        
        // Step 0.5: Check for very short or non-relevant reflection
        const wordCount = reflection.split(/\s+/).length;
        const isVeryShort = wordCount < 20;
        
        // Step 1: Analyze reflection (binary classification at window level, then aggregated)
        const analysisResult = await analyzeReflectionDistribution(reflection, currentLanguage);
        
        // Store binary classification results (window-level D/E/P scores)
        await storeBinaryClassificationResults(analysisResult);
        
        // Step 2: Check for non-meaningful input (short OR non-relevant)
        const isNonRelevant = analysisResult.percentages_priority.professional_vision < 10;
        
        if (isVeryShort || isNonRelevant) {
            displayAnalysisDistribution(analysisResult);
            
            let warningMessage = '';
            if (isVeryShort && isNonRelevant) {
                warningMessage = currentLanguage === 'en'
                    ? "⚠️ Your reflection is very short and does not relate to the teaching video. Please write a longer reflection (at least 50 words) that describes what you observed, explains why it happened using educational theories, and predicts the effects on student learning."
                    : "⚠️ Ihre Reflexion ist sehr kurz und bezieht sich nicht auf das Unterrichtsvideo. Bitte schreiben Sie eine längere Reflexion (mindestens 50 Wörter), die beschreibt, was Sie beobachtet haben, erklärt, warum es passiert ist (unter Verwendung pädagogischer Theorien), und die Auswirkungen auf das Lernen der Schüler vorhersagt.";
            } else if (isVeryShort) {
                warningMessage = currentLanguage === 'en'
                    ? "⚠️ Your reflection is very short (only " + wordCount + " words). Please expand your reflection to at least 50 words, providing more detail about what you observed, why it happened, and its effects on student learning."
                    : "⚠️ Ihre Reflexion ist sehr kurz (nur " + wordCount + " Wörter). Bitte erweitern Sie Ihre Reflexion auf mindestens 50 Wörter und geben Sie mehr Details zu dem, was Sie beobachtet haben, warum es passiert ist und welche Auswirkungen es auf das Lernen der Schüler hat.";
            } else {
                warningMessage = currentLanguage === 'en'
                    ? "⚠️ Your reflection does not relate to the teaching video you watched. Please revise your reflection to focus on describing what you observed, explaining why it happened using educational theories, and predicting the effects on student learning."
                    : "⚠️ Ihre Reflexion bezieht sich nicht auf das Unterrichtsvideo, das Sie sich angeschaut haben. Bitte überarbeiten Sie Ihre Reflexion, um sich auf die Beschreibung Ihrer Beobachtungen, die Erklärung mit Hilfe pädagogischer Theorien und die Vorhersage der Auswirkungen auf das Lernen der Schüler zu konzentrieren.";
            }
            
            logEvent('non_relevant_reflection_detected', {
                participant_name: currentParticipant,
                video_id: currentVideoId,
                language: currentLanguage,
                reflection_length: reflection.length,
                word_count: wordCount,
                professional_vision_percentage: analysisResult.percentages_priority.professional_vision,
                is_very_short: isVeryShort,
                is_non_relevant: isNonRelevant
            });
            
            const ids = getVideoElementIds(videoNum);
            const feedbackExtended = document.getElementById(ids.feedbackExtended);
            const feedbackShort = document.getElementById(ids.feedbackShort);
            if (feedbackExtended) feedbackExtended.innerHTML = `<div class="alert alert-warning"><i class="bi bi-exclamation-triangle me-2"></i>${warningMessage}</div>`;
            if (feedbackShort) feedbackShort.innerHTML = `<div class="alert alert-warning"><i class="bi bi-exclamation-triangle me-2"></i>${warningMessage}</div>`;
            
            const feedbackTabs = document.getElementById(ids.feedbackTabs);
            if (feedbackTabs) feedbackTabs.classList.remove('d-none');
            
            clearInterval(loadingInterval);
            if (loadingSpinner) loadingSpinner.style.display = 'none';
            if (generateBtn) generateBtn.disabled = false;
            return;
        }
        
        // Step 3: Display analysis distribution (using video-specific function)
        displayAnalysisDistributionForVideo(analysisResult, videoNum);
        
        // Step 4: Generate both feedback styles
        const [extendedFeedback, shortFeedback] = await Promise.all([
            generateWeightedFeedback(reflection, currentLanguage, 'academic', analysisResult),
            generateWeightedFeedback(reflection, currentLanguage, 'user-friendly', analysisResult)
        ]);
        
        // Step 5: Add revision suggestion if needed (for non-relevant content)
        let finalShortFeedback = shortFeedback;
        let finalExtendedFeedback = extendedFeedback;
        
        // Add warning if significant non-relevant content
        if (analysisResult && analysisResult.percentages_priority.other > 50) {
            const revisionNote = currentLanguage === 'en' 
                ? "\n\n**⚠️ Important Note:** Your reflection contains a significant amount of content that doesn't follow professional lesson analysis steps. Please revise your reflection to focus more on describing what you observed, explaining why it happened using educational theories, and predicting the effects on student learning."
                : "\n\n**⚠️ Wichtiger Hinweis:** Ihre Reflexion enthält einen erheblichen Anteil an Inhalten, die nicht den Schritten einer professionellen Stundenanalyse folgen. Bitte überarbeiten Sie Ihre Reflexion, um sich mehr auf die Beschreibung Ihrer Beobachtungen, die Erklärung mit Hilfe pädagogischer Theorien und die Vorhersage der Auswirkungen auf das Lernen der Schüler zu konzentrieren.";
            finalShortFeedback += revisionNote;
            finalExtendedFeedback += revisionNote;
            
            logEvent('non_relevant_content_warning', {
                participant_name: currentParticipant,
                video_id: currentVideoId,
                language: currentLanguage,
                other_percentage: analysisResult.percentages_priority.other,
                professional_vision_percentage: analysisResult.percentages_priority.professional_vision
            });
        }
        
        // Add warning if professional vision is low but above threshold
        if (analysisResult && analysisResult.percentages_priority.professional_vision < 30 && analysisResult.percentages_priority.professional_vision >= 10) {
            const lowPVNote = currentLanguage === 'en'
                ? "\n\n**Note:** Your reflection shows limited connection to professional vision concepts. Try to include more descriptions of observable teaching events, explanations linking events to educational theories, and predictions about effects on student learning."
                : "\n\n**Hinweis:** Ihre Reflexion zeigt eine begrenzte Verbindung zu Professional-Vision-Konzepten. Versuchen Sie, mehr Beschreibungen beobachtbarer Unterrichtsereignisse, Erklärungen, die Ereignisse mit pädagogischen Theorien verknüpfen, und Vorhersagen über Auswirkungen auf das Lernen der Schüler einzubeziehen.";
            finalShortFeedback += lowPVNote;
            finalExtendedFeedback += lowPVNote;
        }
        
        // Step 6: Save to database
        await saveFeedbackToDatabase({
            participantCode: currentParticipant,
            videoSelected: currentVideoId,
            reflectionText: reflection,
            analysisResult,
            extendedFeedback: finalExtendedFeedback,
            shortFeedback: finalShortFeedback
        });
        
        // Step 7: Store reflection for duplicate detection
        sessionStorage.setItem(`reflection-${currentVideoId}`, reflection.trim());
        
        // Step 8: Display feedback (using video-specific IDs)
        const ids = getVideoElementIds(videoNum);
        const feedbackExtended = document.getElementById(ids.feedbackExtended);
        const feedbackShort = document.getElementById(ids.feedbackShort);
        if (feedbackExtended) feedbackExtended.innerHTML = formatStructuredFeedback(finalExtendedFeedback, analysisResult);
        if (feedbackShort) feedbackShort.innerHTML = formatStructuredFeedback(finalShortFeedback, analysisResult);
        
        // Step 9: Show tabs (using video-specific IDs)
        const feedbackTabs = document.getElementById(ids.feedbackTabs);
        if (feedbackTabs) feedbackTabs.classList.remove('d-none');
        
        if (userPreferredFeedbackStyle === 'short') {
            document.getElementById(ids.shortTab)?.click();
        } else {
            document.getElementById(ids.extendedTab)?.click();
        }
        
        // Start feedback viewing tracking
        startFeedbackViewing(userPreferredFeedbackStyle, currentLanguage);
        
        // Step 10: Show revise and submit buttons (using correct video-specific IDs)
        const reviseBtn = document.getElementById(ids.reviseBtn);
        const submitBtn = document.getElementById(ids.submitBtn);
        if (reviseBtn) reviseBtn.classList.remove('d-none');
        if (submitBtn) submitBtn.classList.remove('d-none');
        
        currentTaskState.feedbackGenerated = true;
        
        // Log successful feedback generation
        logEvent('feedback_generated_successfully', {
            participant_name: currentParticipant,
            video_id: currentVideoId,
            language: currentLanguage,
            reflection_length: reflection.length,
            word_count: wordCount,
            professional_vision_percentage: analysisResult.percentages_priority.professional_vision,
            other_percentage: analysisResult.percentages_priority.other,
            revision_count: currentTaskState.revisionCount || 0
        });
        
        showAlert('✅ Feedback generated successfully!', 'success');
        
    } catch (error) {
        console.error('Error generating feedback:', error);
        showAlert(`⚠️ ${error.message}`, 'danger');
    } finally {
        clearInterval(loadingInterval);
        if (loadingSpinner) loadingSpinner.style.display = 'none';
        if (generateBtn) generateBtn.disabled = false;
    }
}

// Display analysis distribution
// Display analysis distribution for specific video page
function displayAnalysisDistributionForVideo(analysisResult, videoNum) {
    const ids = getVideoElementIds(videoNum);
    const rawPercentages = analysisResult.percentages_raw || analysisResult.percentages;
    const isGerman = currentLanguage === 'de';
    
    // Create or update distribution container
    const containerId = `analysis-distribution-video-${videoNum}`;
    let container = document.getElementById(containerId);
    if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        container.className = 'analysis-distribution-professional mb-3';
        const feedbackTabs = document.getElementById(ids.feedbackTabs);
        if (feedbackTabs) {
            feedbackTabs.parentNode.insertBefore(container, feedbackTabs);
        }
    }
    
    if (rawPercentages.professional_vision <= 5) {
        container.innerHTML = `
            <div class="professional-analysis-summary">
                <h6>${isGerman ? 'Analyse Ihrer Reflexion' : 'Analysis of Your Reflection'}</h6>
                <p class="analysis-text text-warning">
                    ${isGerman ? 'Ihr Text bezieht sich nicht auf Professional Vision. Überarbeiten Sie ihn, um ihn auf das Video zu beziehen.' 
                              : 'Your text does not relate to professional vision. Revise to relate to the video.'}
                </p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="professional-analysis-summary">
            <h6>${isGerman ? 'Analyse Ihrer Reflexion' : 'Analysis of Your Reflection'}</h6>
            <p class="analysis-text">
                ${isGerman 
                    ? `Ihre Reflexion enthält ${rawPercentages.description || 0}% Beschreibung, ${rawPercentages.explanation || 0}% Erklärung und ${rawPercentages.prediction || 0}% Vorhersage.` 
                    : `Your reflection contains ${rawPercentages.description || 0}% description, ${rawPercentages.explanation || 0}% explanation, and ${rawPercentages.prediction || 0}% prediction.`}
            </p>
        </div>
    `;
}

function displayAnalysisDistribution(analysisResult) {
    const rawPercentages = analysisResult.percentages_raw || analysisResult.percentages;
    const isGerman = currentLanguage === 'de';
    
    // Create or update distribution container
    let container = document.getElementById('analysis-distribution-task');
    if (!container) {
        container = document.createElement('div');
        container.id = 'analysis-distribution-task';
        container.className = 'analysis-distribution-professional mb-3';
        const feedbackTabs = document.getElementById('task-feedback-tabs');
        if (feedbackTabs) {
            feedbackTabs.parentNode.insertBefore(container, feedbackTabs);
        }
    }
    
    if (rawPercentages.professional_vision <= 5) {
        container.innerHTML = `
            <div class="professional-analysis-summary">
                <h6>${isGerman ? 'Analyse Ihrer Reflexion' : 'Analysis of Your Reflection'}</h6>
                <p class="analysis-text text-warning">
                    ${isGerman ? 'Ihr Text bezieht sich nicht auf Professional Vision. Überarbeiten Sie ihn, um ihn auf das Video zu beziehen.' 
                              : 'Your text does not relate to professional vision. Revise to relate to the video.'}
                </p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="professional-analysis-summary">
            <h6>${isGerman ? 'Analyse Ihrer Reflexion' : 'Analysis of Your Reflection'}</h6>
            <p class="analysis-text">
                ${isGerman 
                    ? `Ihre Reflexion enthält ${rawPercentages.description || 0}% Beschreibung, ${rawPercentages.explanation || 0}% Erklärung und ${rawPercentages.prediction || 0}% Vorhersage.` 
                    : `Your reflection contains ${rawPercentages.description || 0}% description, ${rawPercentages.explanation || 0}% explanation, and ${rawPercentages.prediction || 0}% prediction.`}
            </p>
        </div>
    `;
}

// Button handlers
function handleClear() {
    const reflectionText = document.getElementById('task-reflection-text');
    if (reflectionText) {
        reflectionText.value = '';
        updateWordCount();
        reflectionText.focus();
    }
}

function handleCopy() {
    const activeTab = document.querySelector('#task-feedback-tabs .nav-link.active');
    const feedbackType = activeTab?.id.includes('extended') ? 'extended' : 'short';
    const feedbackContent = feedbackType === 'extended'
        ? document.getElementById('task-feedback-extended')?.textContent
        : document.getElementById('task-feedback-short')?.textContent;
    
    if (feedbackContent) {
        navigator.clipboard.writeText(feedbackContent).then(() => {
            showAlert('✅ Feedback copied to clipboard!', 'success');
            logEvent('copy_feedback', {
                video_id: currentVideoId,
                feedback_type: feedbackType,
                reflection_id: currentTaskState.currentReflectionId
            });
        });
    }
}

function handleRevise() {
    if (currentTaskState.currentFeedbackType && currentTaskState.currentFeedbackStartTime) {
        endFeedbackViewing(currentTaskState.currentFeedbackType, currentLanguage);
    }
    
    document.getElementById('task-reflection-text')?.focus();
    showAlert('You can now revise your reflection and generate new feedback.', 'info');
    
    currentTaskState.revisionCount = (currentTaskState.revisionCount || 0) + 1;
    
    logEvent('click_revise', {
        video_id: currentVideoId,
        reflection_id: currentTaskState.currentReflectionId,
        revision_number: currentTaskState.revisionCount
    });
}

// Handle save reflection (without final submission)
async function handleSaveReflection(videoNum) {
    const videoId = `video${videoNum}`;
    const ids = getVideoElementIds(videoNum);
    const reflectionText = document.getElementById(ids.reflectionText)?.value?.trim();
    
    if (!reflectionText || reflectionText.length < 10) {
        const t = translations[currentLanguage];
        showAlert(currentLanguage === 'en' ? 'Please write a reflection before saving.' : 'Bitte schreiben Sie eine Reflexion, bevor Sie speichern.', 'warning');
        return;
    }
    
    // Save reflection to database (as a draft/save, not final)
    if (supabase && currentParticipant) {
        // Ensure session_id is set
        if (!currentSessionId) {
            currentSessionId = getOrCreateSessionId();
        }
        
        try {
            const { data, error } = await supabase
                .from('reflections')
                .insert([{
                    session_id: currentSessionId,
                    participant_name: currentParticipant,
                    video_id: videoId,
                    task_id: videoId,
                    language: currentLanguage,
                    reflection_text: reflectionText,
                    revision_number: currentTaskState.revisionCount || 1,
                    // No feedback for save (draft save)
                    feedback_extended: null,
                    feedback_short: null,
                    analysis_percentages: null,
                    weakest_component: null
                }])
                .select()
                .single();
            
            if (error) {
                console.error('Error saving reflection:', error);
                showAlert('❌ ' + (currentLanguage === 'en' ? 'Error saving reflection' : 'Fehler beim Speichern der Reflexion'), 'danger');
            } else {
                currentTaskState.currentReflectionId = data?.id;
                logEvent('reflection_saved_draft', {
                    video_id: videoId,
                    participant_name: currentParticipant,
                    reflection_id: data?.id,
                    reflection_length: reflectionText.length
                });
                showAlert('💾 ' + (currentLanguage === 'en' ? 'Reflection saved!' : 'Reflexion gespeichert!'), 'success');
            }
        } catch (error) {
            console.error('Error in handleSaveReflection:', error);
        }
    }
}

function handleFinalSubmission() {
    const currentVideoPage = document.querySelector('.video-task-page:not(.d-none)');
    if (currentVideoPage) {
        const videoId = currentVideoPage.dataset.videoId;
        const videoNum = getVideoPageNumber(videoId);
        handleFinalSubmissionForVideo(videoNum);
    }
}

function handleFinalSubmissionForVideo(videoNum) {
    const ids = getVideoElementIds(videoNum);
    const submitBtn = document.getElementById(ids.submitBtn);
    const originalSubmitHtml = submitBtn ? submitBtn.innerHTML : null;
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>${submitBtn.dataset.loadingLabel || 'Submitting...'}`;
    }

    const videoId = `video${videoNum}`;
    const video = VIDEOS.find(v => v.id === videoId);
    
    // For reflection-only mode, skip confirmation modal and submit directly
    if (video && !video.hasINFER) {
        submitReflectionOnly(videoNum).finally(() => {
            if (submitBtn && originalSubmitHtml !== null) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalSubmitHtml;
            }
        });
        return;
    }
    
    // For INFER mode, show confirmation modal
    const modal = document.getElementById('final-submission-modal');
    if (modal) {
        modal.dataset.videoNum = videoNum;
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
    } else {
        // If modal doesn't exist, directly confirm
        confirmFinalSubmissionForVideo(videoNum).finally(() => {
            if (submitBtn && originalSubmitHtml !== null) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalSubmitHtml;
            }
        });
    }
}

// Submit reflection without INFER feedback (reflection-only mode)
async function submitReflectionOnly(videoNum) {
    const ids = getVideoElementIds(videoNum);
    const submitBtn = document.getElementById(ids.submitBtn);
    const originalSubmitHtml = submitBtn ? submitBtn.innerHTML : null;
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>${submitBtn.dataset.loadingLabel || 'Submitting...'}`;
    }

    const videoId = `video${videoNum}`;
    const reflectionText = document.getElementById(ids.reflectionText)?.value?.trim();
    
    if (!reflectionText || reflectionText.length < 10) {
        const t = translations[currentLanguage];
        showAlert(currentLanguage === 'en' ? 'Please write a reflection before submitting.' : 'Bitte schreiben Sie eine Reflexion, bevor Sie einreichen.', 'warning');
        return;
    }
    
    // Make reflection read-only after final submission
    const reflectionTextArea = document.getElementById(ids.reflectionText);
    if (reflectionTextArea) {
        reflectionTextArea.readOnly = true;
        reflectionTextArea.style.backgroundColor = '#f5f5f5';
        reflectionTextArea.style.cursor = 'not-allowed';
    }
    
    // Disable/hide edit buttons
    const saveBtn = document.getElementById(ids.saveBtn);
    if (saveBtn) saveBtn.disabled = true;
    
    const clearBtn = document.getElementById(ids.clearBtn);
    if (clearBtn) clearBtn.disabled = true;
    
    const generateBtn = document.getElementById(ids.generateBtn);
    if (generateBtn) generateBtn.disabled = true;
    
    // Save reflection to database (without feedback)
    if (supabase && currentParticipant) {
        try {
            const { data, error } = await supabase
                .from('reflections')
                .insert([{
                    session_id: currentSessionId,
                    participant_name: currentParticipant,
                    video_id: videoId,
                    task_id: videoId,
                    language: currentLanguage,
                    reflection_text: reflectionText,
                    revision_number: 1,
                    // No feedback for reflection-only mode
                    feedback_extended: null,
                    feedback_short: null,
                    analysis_percentages: null,
                    weakest_component: null
                }])
                .select()
                .single();
            
            if (error) {
                console.error('Error saving reflection:', error);
            } else {
                currentTaskState.currentReflectionId = data?.id;
                logEvent('reflection_only_submitted', {
                    video_id: videoId,
                    participant_name: currentParticipant,
                    reflection_id: data?.id,
                    reflection_length: reflectionText.length
                });
            }
        } catch (error) {
            console.error('Error in submitReflectionOnly:', error);
        }
    }
    
    // Mark video as completed
    markVideoCompleted();
    
    showAlert('✅ ' + (currentLanguage === 'en' ? 'Reflection submitted successfully!' : 'Reflexion erfolgreich eingereicht!'), 'success');
    
    // Navigate to post-video survey
    setTimeout(() => {
        showPage(`post-video-survey-${videoNum}`);
        loadSurvey(`post_video_${videoNum}`);
    }, 1500);

    if (submitBtn && originalSubmitHtml !== null) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalSubmitHtml;
    }
}

function confirmFinalSubmission() {
    const currentVideoPage = document.querySelector('.video-task-page:not(.d-none)');
    if (currentVideoPage) {
        const videoId = currentVideoPage.dataset.videoId;
        const videoNum = getVideoPageNumber(videoId);
        confirmFinalSubmissionForVideo(videoNum);
    }
}

function confirmFinalSubmissionForVideo(videoNum) {
    const videoId = `video${videoNum}`;
    const video = VIDEOS.find(v => v.id === videoId);
    const ids = getVideoElementIds(videoNum);
    
    // Make reflection read-only after final submission
    const reflectionTextArea = document.getElementById(ids.reflectionText);
    if (reflectionTextArea) {
        reflectionTextArea.readOnly = true;
        reflectionTextArea.style.backgroundColor = '#f5f5f5';
        reflectionTextArea.style.cursor = 'not-allowed';
    }
    
    // Disable/hide edit buttons
    const saveBtn = document.getElementById(ids.saveBtn);
    if (saveBtn) saveBtn.disabled = true;
    
    const submitBtn = document.getElementById(ids.submitBtn);
    if (submitBtn) submitBtn.disabled = true;
    
    const clearBtn = document.getElementById(ids.clearBtn);
    if (clearBtn) clearBtn.disabled = true;
    
    const generateBtn = document.getElementById(ids.generateBtn);
    if (generateBtn) generateBtn.disabled = true;
    
    // Mark video as completed
    markVideoCompleted();
    
    // Log final submission
    logEvent('final_submission', {
        video_id: videoId,
        participant_name: currentParticipant,
        language: currentLanguage,
        reflection_id: currentTaskState.currentReflectionId,
        total_revisions: currentTaskState.revisionCount || 1,
        final_reflection_length: document.getElementById(ids.reflectionText)?.value.length || 0,
        has_infer: video?.hasINFER || false
    });
    
    const t = translations[currentLanguage];
    showAlert('✅ ' + (currentLanguage === 'en' ? 'Final reflection submitted successfully!' : 'Endgültige Reflexion erfolgreich eingereicht!'), 'success');
    
    // Navigate to post-survey page for this video
    setTimeout(() => {
        showPage(`post-video-survey-${videoNum}`);
        loadSurvey(`post_video_${videoNum}`);
    }, 1500);
}

// Mark video as completed
async function markVideoCompleted() {
    if (!supabase || !currentParticipant || !currentVideoId) return;
    
    try {
        const videosCompleted = currentParticipantProgress.videos_completed || [];
        if (!videosCompleted.includes(currentVideoId)) {
            videosCompleted.push(currentVideoId);
        }
        
        const { error } = await supabase
            .from('participant_progress')
            .update({ 
                videos_completed: videosCompleted,
                last_active_at: new Date().toISOString()
            })
            .eq('participant_name', currentParticipant);
        
        if (error) {
            console.error('Error marking video completed:', error);
        } else {
            currentParticipantProgress.videos_completed = videosCompleted;
            logEvent('video_completed', {
                participant_name: currentParticipant,
                video_id: currentVideoId
            });
        }
    } catch (error) {
        console.error('Error in markVideoCompleted:', error);
    }
}

// Language switching
// Language Management Functions
function switchLanguage(lang) {
    currentLanguage = lang;
    renderLanguageSwitchers();
    renderLanguageSwitcherInNav();
    applyTranslations();
    
    // Update all language radio buttons (including video pages and general language switchers)
    document.querySelectorAll('input[type="radio"][name^="video-"], input[type="radio"][name="language-task1"]').forEach(radio => {
        if (radio.id.includes(`lang-${lang}`)) {
            radio.checked = true;
        }
    });
    
    // Re-render dashboard if on dashboard page (to update video cards with new language)
    if (currentPage === 'dashboard' && currentParticipantProgress) {
        renderDashboard();
    }
    
    // Update video page titles/subtitles if on a video page
    if (currentPage.startsWith('video-')) {
        const videoNum = parseInt(currentPage.replace('video-', ''));
        const videoId = `video${videoNum}`;
        const video = VIDEOS.find(v => v.id === videoId);
        if (video) {
            const ids = getVideoElementIds(videoNum);
            const titleEl = document.getElementById(ids.title);
            const subtitleEl = document.getElementById(ids.subtitle);
                if (titleEl) {
                    // Use consistent INFER Video Reflection Task title
                    titleEl.setAttribute('data-lang-key', 'video_task_title');
                    titleEl.textContent = translations[currentLanguage].video_task_title;
                }
            if (subtitleEl) {
                subtitleEl.textContent = translations[currentLanguage].video_task_subtitle;
            }
        }
    }
    
    // Log language change with participant info
    logEvent('language_change', {
        new_language: lang,
        participant_name: currentParticipant || null,
        page: currentPage,
        video_id: currentVideoId
    });
}

function renderLanguageSwitchers() {
    const containers = document.querySelectorAll('.language-switcher-container');
    const t = translations[currentLanguage];
    const tooltipText = t.language_tooltip || (currentLanguage === 'en' 
        ? "Select the language for feedback generation. Feedback will be generated in the selected language (English or German). Switch before generating, or regenerate to change the feedback language."
        : "Wählen Sie die Sprache für die Feedback-Generierung. Das Feedback wird in der ausgewählten Sprache (Englisch oder Deutsch) generiert. Vor der Generierung wechseln oder neu generieren, um die Feedback-Sprache zu ändern.");
    
    containers.forEach(container => {
        container.innerHTML = `
            <div class="btn-group" role="group">
                <button type="button" class="btn ${currentLanguage === 'en' ? 'btn-primary' : 'btn-outline-primary'}" id="lang-switch-en" title="${tooltipText}">English</button>
                <button type="button" class="btn ${currentLanguage === 'de' ? 'btn-primary' : 'btn-outline-primary'}" id="lang-switch-de" title="${tooltipText}">Deutsch</button>
            </div>
        `;
    });
    
    // Add event listeners
    document.getElementById('lang-switch-en')?.addEventListener('click', () => switchLanguage('en'));
    document.getElementById('lang-switch-de')?.addEventListener('click', () => switchLanguage('de'));
    
    // Initialize Bootstrap tooltips
    containers.forEach(container => {
        const tooltipTriggerList = container.querySelectorAll('[title]');
        tooltipTriggerList.forEach(tooltipTriggerEl => {
            new bootstrap.Tooltip(tooltipTriggerEl);
        });
    });
    
    // Initialize Bootstrap tooltips
    containers.forEach(container => {
        const tooltipTriggerList = container.querySelectorAll('[title]');
        tooltipTriggerList.forEach(tooltipTriggerEl => {
            new bootstrap.Tooltip(tooltipTriggerEl);
        });
    });
}

function renderLanguageSwitcherInNav() {
    const navContainer = document.querySelector('.language-switcher-container-inline');
    const t = translations[currentLanguage];
    const tooltipText = t.language_tooltip || (currentLanguage === 'en' 
        ? "Select the language for feedback generation. Feedback will be generated in the selected language (English or German). Switch before generating, or regenerate to change the feedback language."
        : "Wählen Sie die Sprache für die Feedback-Generierung. Das Feedback wird in der ausgewählten Sprache (Englisch oder Deutsch) generiert. Vor der Generierung wechseln oder neu generieren, um die Feedback-Sprache zu ändern.");
    
    if (navContainer) {
        navContainer.innerHTML = `
            <div class="btn-group" role="group">
                <button type="button" class="btn btn-sm ${currentLanguage === 'en' ? 'btn-primary' : 'btn-outline-primary'}" id="nav-lang-switch-en" title="${tooltipText}">English</button>
                <button type="button" class="btn btn-sm ${currentLanguage === 'de' ? 'btn-primary' : 'btn-outline-primary'}" id="nav-lang-switch-de" title="${tooltipText}">Deutsch</button>
            </div>
        `;
        
        // Add event listeners
        document.getElementById('nav-lang-switch-en')?.addEventListener('click', () => switchLanguage('en'));
        document.getElementById('nav-lang-switch-de')?.addEventListener('click', () => switchLanguage('de'));
        
        // Initialize Bootstrap tooltips
        const tooltipTriggerList = navContainer.querySelectorAll('[title]');
        tooltipTriggerList.forEach(tooltipTriggerEl => {
            new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }
    
    // Also render language switcher in dashboard header
    const dashboardHeaderSwitcher = document.querySelector('.language-switcher-container-inline-header');
    if (dashboardHeaderSwitcher) {
        dashboardHeaderSwitcher.innerHTML = `
            <div class="btn-group" role="group">
                <button type="button" class="btn ${currentLanguage === 'en' ? 'btn-primary' : 'btn-outline-primary'}" id="header-lang-switch-en" title="${tooltipText}">English</button>
                <button type="button" class="btn ${currentLanguage === 'de' ? 'btn-primary' : 'btn-outline-primary'}" id="header-lang-switch-de" title="${tooltipText}">Deutsch</button>
            </div>
        `;
        
        // Add event listeners
        document.getElementById('header-lang-switch-en')?.addEventListener('click', () => switchLanguage('en'));
        document.getElementById('header-lang-switch-de')?.addEventListener('click', () => switchLanguage('de'));
        
        // Initialize Bootstrap tooltips
        const tooltipTriggerList = dashboardHeaderSwitcher.querySelectorAll('[title]');
        tooltipTriggerList.forEach(tooltipTriggerEl => {
            new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }
}

function applyTranslations() {
    const t = translations[currentLanguage];
    if (!t) return;
    
    // Update all elements with data-lang-key-placeholder attribute (for placeholders)
    document.querySelectorAll('[data-lang-key-placeholder]').forEach(element => {
        const key = element.getAttribute('data-lang-key-placeholder');
        if (t[key]) {
            element.placeholder = t[key];
        }
    });
    
    // Update all elements with data-lang-key attribute
    document.querySelectorAll('[data-lang-key]').forEach(element => {
        const key = element.getAttribute('data-lang-key');
        if (t[key]) {
            // Check if it's a placeholder (has placeholder attribute)
            if (element.hasAttribute('placeholder') && !element.hasAttribute('data-lang-key-placeholder')) {
                element.placeholder = t[key];
            } 
            // For buttons with spans inside, update the span
            else if (element.tagName === 'BUTTON' && element.querySelector('span[data-lang-key]')) {
                const span = element.querySelector('span[data-lang-key]');
                if (span && span.getAttribute('data-lang-key') === key) {
                    span.textContent = t[key];
                }
            } 
            // For span elements directly - use innerHTML to preserve HTML tags
            else if (element.tagName === 'SPAN' && element.hasAttribute('data-lang-key')) {
                // Use innerHTML if the translation contains HTML tags, otherwise use textContent
                if (t[key].includes('<') && t[key].includes('>')) {
                    element.innerHTML = t[key];
                } else {
                    element.textContent = t[key];
                }
            }
            // Special handling for back-to-dashboard buttons - update span inside button
            else if (element.classList && element.classList.contains('back-to-dashboard-btn')) {
                const span = element.querySelector('span[data-lang-key="back_to_dashboard"]');
                if (span && t.back_to_dashboard) {
                    span.textContent = t.back_to_dashboard;
                }
            } 
            // For input elements, check if they should have placeholder updated
            else if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                // Only update placeholder if it's a text input/textarea
                if (element.type === 'text' || element.type === 'textarea' || element.tagName === 'TEXTAREA') {
                    if (key.includes('placeholder') || key.includes('reflection') || key.includes('paste')) {
                        element.placeholder = t[key];
                    } else {
                        element.textContent = t[key];
                    }
                } else {
                    element.textContent = t[key];
                }
            }
            // For other elements, update text content directly
            else {
                // Only update if element doesn't have children with data-lang-key (to preserve structure)
                const hasChildrenWithLangKey = element.querySelector('[data-lang-key]');
                if (!hasChildrenWithLangKey || ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LABEL'].includes(element.tagName)) {
                    // Use innerHTML for elements that might contain HTML
                    if (t[key].includes('<') && t[key].includes('>')) {
                        element.innerHTML = t[key];
                    } else {
                        element.textContent = t[key];
                    }
                }
            }
        }
    });
    
    // Update HTML lang attribute
    document.documentElement.lang = currentLanguage;
}

// AI Usage Modal
function showAIUsageModal() {
    const modal = new bootstrap.Modal(document.getElementById('ai-usage-modal'));
    modal.show();
}

function handleAIUsageResponse(usedAI) {
    logEvent('ai_usage_response', {
        used_ai: usedAI,
        tab_switch_count: tabSwitchCount,
        current_page: currentPage,
        video_id: currentVideoId,
        timestamp: new Date().toISOString()
    });
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('ai-usage-modal'));
    if (modal) modal.hide();
    
    if (usedAI) {
        const message = currentLanguage === 'de' 
            ? 'Vielen Dank für Ihre Ehrlichkeit. Bitte beachten Sie, dass diese Aufgabe Ihre eigene Analyse erfordert.'
            : 'Thank you for your honesty. Please note that this task requires your own analysis.';
        showAlert(message, 'warning');
    }
}

// Make handleAIUsageResponse global for onclick
window.handleAIUsageResponse = handleAIUsageResponse;

// Feedback viewing tracking
function startFeedbackViewing(style, language) {
    currentTaskState.currentFeedbackStartTime = Date.now();
    currentTaskState.currentFeedbackType = style;
    
    logEvent('view_feedback_start', {
        video_id: currentVideoId,
        style: style,
        language: language,
        participant_name: currentParticipant || null,
        reflection_id: currentTaskState.currentReflectionId
    });
}

function endFeedbackViewing(style, language) {
    if (!currentTaskState.currentFeedbackStartTime) return;
    
    const duration = (Date.now() - currentTaskState.currentFeedbackStartTime) / 1000;
    logEvent('view_feedback_end', {
        video_id: currentVideoId,
        style: style,
        language: language,
        participant_name: currentParticipant || null,
        duration_seconds: duration,
        reflection_id: currentTaskState.currentReflectionId
    });
    
    currentTaskState.currentFeedbackStartTime = null;
    currentTaskState.currentFeedbackType = null;
}

// Alert system
function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alert-container');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.role = 'alert';
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    alertContainer.appendChild(alert);
    
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

// ============================================================================
// Core Analysis Functions (Same as original - keep all logic)
// ============================================================================

async function analyzeReflectionDistribution(reflection, language) {
    try {
        const windows = createSentenceWindows(reflection);
        const classificationResults = [];
        
        for (const window of windows) {
            const [description, explanation, prediction] = await Promise.all([
                classifyDescription(window.text),
                classifyExplanation(window.text),
                classifyPrediction(window.text)
            ]);
            
            classificationResults.push({
                window_id: window.id,
                window_text: window.text,
                description,
                explanation,
                prediction
            });
        }
        
        const analysis = calculatePercentages(classificationResults);
        analysis.classificationResults = classificationResults;
        analysis.windows = windows;
        
        return analysis;
    } catch (error) {
        console.error('Error in classification:', error);
        return {
            percentages_raw: { description: 30, explanation: 35, prediction: 25, professional_vision: 90 },
            percentages_priority: { description: 30, explanation: 35, prediction: 25, other: 10, professional_vision: 90 },
            weakest_component: "Prediction",
            classificationResults: [],
            windows: []
        };
    }
}

function createSentenceWindows(text) {
    const sentences = text.match(/[^\.!?]+[\.!?]+/g) || [text];
    const cleanSentences = sentences.map(s => s.trim()).filter(s => s.length > 0);
    
    const windows = [];
    let windowId = 1;
    
    for (let i = 0; i < cleanSentences.length; i += 3) {
        const remainingSentences = cleanSentences.length - i;
        const sentenceCount = Math.min(3, remainingSentences);
        const windowText = cleanSentences.slice(i, i + sentenceCount).join(' ');
        
        if (windowText.length >= 20) {
            windows.push({
                id: `chunk_${String(windowId++).padStart(3, '0')}`,
                text: windowText,
                sentence_count: sentenceCount,
                start_position: i
            });
        }
    }
    
    return windows.length > 0 ? windows : [{ 
        id: 'chunk_001', 
        text: text, 
        sentence_count: 1, 
        start_position: 0 
    }];
}

async function classifyDescription(windowText) {
    const prompt = `You are an expert in analyzing teaching reflections. Determine if this text contains descriptions of observable teaching events.

DEFINITION: Descriptions identify and differentiate teaching events based on educational knowledge, WITHOUT making evaluations, interpretations, or speculations.

CRITERIA FOR "1" (Contains Description):
- Identifies observable teacher or student actions
- Relates to learning processes, teaching processes, or learning activities
- Uses neutral, observational language
- Must be relevant to teaching/learning context

CRITERIA FOR "0" (No Description):
- Contains evaluations, interpretations, or speculations
- Not about teaching/learning events
- Non-relevant content (e.g., personal opinions unrelated to teaching, random text)
- Too short or meaningless fragments

INSTRUCTIONS: 
- Respond with ONLY "1" or "0"
- Be conservative: only respond "1" if clearly certain the criteria are met
- If text is non-relevant or too short, respond "0"

TEXT: ${windowText}`;

    return await callBinaryClassifier(prompt);
}

async function classifyExplanation(windowText) {
    const prompt = `Task: Identify whether the following text belongs to the category "Explanation of Relevant Classroom Events."

Core Principle: An explanation connects observable classroom events with reasons WHY they occurred or WHY they matter for teaching and learning.

Key Question: Does the text explain WHY something happened in the classroom that relates to teaching or learning processes?

Code as "1" (Explanation) when the text contains:
* An observable classroom event (what teacher/students actually did)
* PLUS a reason WHY it happened or WHY it affects learning
* Even basic pedagogical reasoning counts
* Partial explanations are sufficient - if ANY part explains, code as "1"

Be INCLUSIVE - Accept these as explanations:
* Simple cause-effect statements about classroom dynamics
* Common-sense pedagogical reasoning without technical terms
* Connections between teaching actions and student responses
* Basic explanations of learning processes
* Informal observations about why teaching methods work/don't work

Code as "0" (Non-Explanation) only when:
* Text is purely descriptive with no causal reasoning
* Discusses hypothetical/future actions ("should have," "would have")
* Contains no WHY reasoning about actual classroom events
* Lacks any connection to teaching/learning processes

Positive Examples (Code as "1"):
* "The students were engaged because the activity was hands-on"
* "The teacher's open questions give students room for their own thoughts"
* "Through repetition, students can better remember the conjugations"
* "The unclear instructions confused the students"
* "Students don't participate because the teacher doesn't give them enough time to think"
* "Using role-play helps students remember vocabulary better"
* "The teacher goes through the rows to ensure all students are working"
* "By connecting to prior knowledge, learning becomes easier"
* "The negative feedback could discourage future participation"
* "Clear learning goals help students understand what's expected"

Negative Examples (Code as "0"):
* "The teacher writes the topic on the board"
* "Students work on the worksheet"
* "The classroom is noisy"
* "The teacher should have given more time"
* "I would have explained it differently"
* "The students seem tired"
* "Two newspaper articles are hanging on the board"
* "The lesson continues with the next exercise"
* "This happens in math class"
* "The teacher is male and middle-aged"

Remember:
* Focus on finding ANY explanatory content about WHY classroom events occur
* Don't require formal educational terminology
* Accept partial explanations within longer texts
* When uncertain, lean toward inclusion (code as "1")
* Look for connections between events and their effects on teaching/learning

Output only "1" or "0" without any additional text or quotation marks.

Text to be evaluated: ${windowText}`;

    return await callBinaryClassifier(prompt);
}

async function classifyPrediction(windowText) {
    const prompt = `You are an expert in analyzing teaching reflections. Determine if this text contains predictions about effects of teaching events on student learning.

DEFINITION: Predictions estimate potential consequences of teaching events for students based on learning theories.

CRITERIA FOR "1" (Contains Prediction):
- Predicts effects on student learning, motivation, or understanding
- Based on educational knowledge about learning
- Focuses on consequences for students
- Examples: "This feedback could increase motivation", "Students may feel confused"
- Must be relevant to teaching/learning context

CRITERIA FOR "0" (No Prediction):
- No effects on student learning mentioned
- Predictions without educational basis
- No connection to teaching events
- Predictions about non-learning outcomes
- Non-relevant content unrelated to teaching
- Too short or meaningless fragments

INSTRUCTIONS:
- Respond with ONLY "1" or "0"
- No explanations, quotes, or other text
- "1" if ANY part predicts effects on student learning
- "0" if no learning consequences mentioned OR if content is non-relevant
- Be conservative: only respond "1" if clearly certain

TEXT: ${windowText}`;

    return await callBinaryClassifier(prompt);
}

async function callBinaryClassifier(prompt) {
    const requestData = {
        model: model,
        messages: [
            {
                role: "system",
                content: "You are an expert teaching reflection analyst. Be conservative in your classifications - only respond '1' if you are clearly certain the criteria are met. Respond with ONLY '1' or '0'."
            },
            {
                role: "user",
                content: prompt
            }
        ],
        temperature: 0.0,
        max_tokens: 10
    };
    
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const response = await fetch(OPENAI_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Unknown error');
                console.error(`Binary classifier attempt ${attempt + 1} failed: HTTP ${response.status}`, errorText);
                console.error(`API URL: ${OPENAI_API_URL}`);
                console.error(`Request data:`, JSON.stringify(requestData, null, 2));
                continue;
            }
            
            const result = await response.json();
            if (!result.choices || !result.choices[0]) {
                console.error(`Binary classifier attempt ${attempt + 1}: Invalid response format`, result);
                continue;
            }
            const output = result.choices[0].message.content.trim();
            
            if (output === '1' || output === '0') {
                return parseInt(output);
            }
            
            if (output.includes('1')) return 1;
            if (output.includes('0')) return 0;
            
            console.warn(`Binary classifier attempt ${attempt + 1}: Unexpected output: "${output}"`);
            
        } catch (error) {
            console.warn(`Binary classifier attempt ${attempt + 1} failed:`, error);
        }
    }
    
    console.error('All binary classifier attempts failed, defaulting to 0');
    return 0;
}

function calculatePercentages(classificationResults) {
    const totalWindows = classificationResults.length;
    
    if (totalWindows === 0) {
        return {
            percentages_raw: { description: 0, explanation: 0, prediction: 0, professional_vision: 0 },
            percentages_priority: { description: 0, explanation: 0, prediction: 0, other: 100, professional_vision: 0 },
            weakest_component: "Prediction",
            analysis_summary: "No valid windows for analysis"
        };
    }
    
    // RAW CALCULATION (can exceed 100%)
    let rawDescriptionCount = 0;
    let rawExplanationCount = 0;
    let rawPredictionCount = 0;
    
    classificationResults.forEach(result => {
        if (result.description === 1) rawDescriptionCount++;
        if (result.explanation === 1) rawExplanationCount++;
        if (result.prediction === 1) rawPredictionCount++;
    });
    
    const rawPercentages = {
        description: Math.round((rawDescriptionCount / totalWindows) * 100 * 10) / 10,
        explanation: Math.round((rawExplanationCount / totalWindows) * 100 * 10) / 10,
        prediction: Math.round((rawPredictionCount / totalWindows) * 100 * 10) / 10,
        professional_vision: Math.round(((rawDescriptionCount + rawExplanationCount + rawPredictionCount) / totalWindows) * 100 * 10) / 10
    };
    
    // PRIORITY-BASED CALCULATION (adds to 100%)
    let descriptionCount = 0;
    let explanationCount = 0;
    let predictionCount = 0;
    let otherCount = 0;
    
    classificationResults.forEach(result => {
        if (result.description === 1) {
            descriptionCount++;
        } else if (result.explanation === 1) {
            explanationCount++;
        } else if (result.prediction === 1) {
            predictionCount++;
        } else {
            otherCount++;
        }
    });
    
    const priorityPercentages = {
        description: Math.round((descriptionCount / totalWindows) * 100 * 10) / 10,
        explanation: Math.round((explanationCount / totalWindows) * 100 * 10) / 10,
        prediction: Math.round((predictionCount / totalWindows) * 100 * 10) / 10,
        other: Math.round((otherCount / totalWindows) * 100 * 10) / 10,
        professional_vision: Math.round(((descriptionCount + explanationCount + predictionCount) / totalWindows) * 100 * 10) / 10
    };
    
    // Find weakest component
    const components = {
        'Description': priorityPercentages.description,
        'Explanation': priorityPercentages.explanation,
        'Prediction': priorityPercentages.prediction
    };
    
    const weakestComponent = Object.keys(components).reduce((a, b) => 
        components[a] <= components[b] ? a : b
    );
    
    return {
        percentages_raw: rawPercentages,
        percentages_priority: priorityPercentages,
        percentages: rawPercentages,
        weakest_component: weakestComponent,
        analysis_summary: `Analyzed ${totalWindows} windows. Raw: D:${rawPercentages.description}% E:${rawPercentages.explanation}% P:${rawPercentages.prediction}% (Total PV: ${rawPercentages.professional_vision}%). Priority-based: D:${priorityPercentages.description}% E:${priorityPercentages.explanation}% P:${priorityPercentages.prediction}% Other:${priorityPercentages.other}% = 100%`
    };
}

// ============================================================================
// Feedback Generation (Same as original)
// ============================================================================

// Generate simple feedback for Gamma (Control Group) - 8-9 sentences
async function generateSimpleFeedback(reflection, language) {
    const languageInstruction = language === 'en' 
        ? "IMPORTANT: You MUST respond in English. The entire feedback MUST be in English only."
        : "WICHTIG: Sie MÜSSEN auf Deutsch antworten. Das gesamte Feedback MUSS ausschließlich auf Deutsch sein.";
    
    // Simple and direct feedback prompt for Gamma (Control Group)
    // Request 8-9 sentences of feedback
    const simplePrompt = language === 'en'
        ? "Provide feedback (8-9 sentences) for my teaching reflection."
        : "Geben Sie Feedback (8-9 Sätze) für meine Unterrichtsreflexion.";
    
    const requestData = {
        model: model,
        messages: [
            { role: "system", content: languageInstruction + "\n\n" + simplePrompt },
            { role: "user", content: reflection }
        ],
        temperature: 0.3,
        max_tokens: 2000
    };
    
    try {
        console.log('Gamma: Calling OpenAI API via CORS proxy:', OPENAI_API_URL);
        console.log('Gamma: Request data:', JSON.stringify(requestData, null, 2));
        
        const response = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            console.error('Gamma: API response error:', response.status, errorText);
            let errorData = {};
            try {
                errorData = JSON.parse(errorText);
            } catch (e) {
                errorData = { error: { message: errorText } };
            }
            throw new Error(errorData.error?.message || `HTTP ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        console.log('Gamma: API response received successfully');
        return result.choices[0].message.content;
    } catch (error) {
        console.error('Gamma: Error in generateSimpleFeedback:', error);
        console.error('Gamma: API URL was:', OPENAI_API_URL);
        console.error('Gamma: CORS Proxy URL:', CORS_PROXY_URL);
        throw error;
    }
}

async function generateWeightedFeedback(reflection, language, style, analysisResult) {
    // This function is not used in Gamma (Control Group) - kept for compatibility
    // Gamma uses generateSimpleFeedback instead
    return await generateSimpleFeedback(reflection, language);
    
    try {
        const response = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            let errorData = {};
            try {
                errorData = JSON.parse(errorText);
            } catch (e) {
                errorData = { error: { message: errorText } };
            }
            console.error(`Feedback generation failed: HTTP ${response.status}`, errorData);
            console.error(`API URL: ${OPENAI_API_URL}`);
            throw new Error(errorData.error?.message || `HTTP ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        let feedback = result.choices[0].message.content;
        
        if (style === 'user-friendly') {
            feedback = feedback.replace(/\s*\([^)]+\d{4}\)/g, '');
        }
        
        return feedback;
    } catch (error) {
        console.error('Error in generateWeightedFeedback:', error);
        throw error;
    }
}

function getFeedbackPrompt(promptType, analysisResult) {
    const weakestComponent = analysisResult?.weakest_component || 'Prediction';
    
    const prompts = {
        'academic English': `You are a supportive yet rigorous teaching mentor providing feedback in a scholarly tone. Your feedback MUST be detailed, academic, and comprehensive, deeply integrating theory.

**Knowledge Base Integration:**
You MUST base your feedback on the theoretical framework of empirical teaching quality research. Specifically, use the process-oriented teaching-learning model (Seidel & Shavelson, 2007) or the three basic dimensions of teaching quality (Klieme, 2006) for feedback on description and explanation. For prediction, use self-determination theory (Deci & Ryan, 1993) or theories of cognitive and constructive learning (Atkinson & Shiffrin, 1968; Craik & Lockhart, 1972).

**CRITICAL: You MUST explicitly cite these theories using the (Author, Year) format. Do NOT cite any other theories.**

**MANDATORY WEIGHTED FEEDBACK STRUCTURE:**
1. **Weakest Area Focus**: Write 6-8 detailed, academic sentences ONLY for the weakest component (${weakestComponent}), integrating multiple specific suggestions and deeply connecting them to theory.
2. **Stronger Areas**: For the two stronger components, write EXACTLY 3-4 detailed sentences each (1 Strength, 1 Suggestion, 1 'Why' that explicitly connects to theory).
3. **Conclusion**: Write 2-3 sentences summarizing the key area for development.

**CRITICAL FOCUS REQUIREMENTS:**
- Focus ONLY on analysis skills, not teaching performance.
- Emphasize objective, non-evaluative observation for the Description section.

**FORMATTING:**
- Sections: "#### Description", "#### Explanation", "#### Prediction", "#### Conclusion"
- Sub-headings: "Strength:", "Suggestions:", "Why:"`,
        
        'user-friendly English': `You are a friendly teaching mentor providing feedback for a busy teacher who wants quick, practical tips.

**Style Guide - MUST BE FOLLOWED:**
- **Language**: Use simple, direct language. Avoid academic jargon completely.
- **Citations**: Do NOT include any in-text citations like (Author, Year).
- **Focus**: Give actionable advice. Do NOT explain the theory behind the advice.

**MANDATORY CONCISE FEEDBACK STRUCTURE:**
1. **Weakest Area Focus**: For the weakest component (${weakestComponent}), provide a "Good:" section with 1-2 sentences, and a "Tip:" section with a bulleted list of 2-3 clear, practical tips.
2. **Stronger Areas**: For the two stronger components, write a "Good:" section with one sentence and a "Tip:" section with one practical tip.
3. **No Conclusion**: Do not include a "Conclusion" section.

**FORMATTING:**
- Sections: "#### Description", "#### Explanation", "#### Prediction"
- Sub-headings: "Good:", "Tip:"`,
        
        'academic German': `Sie sind ein unterstützender, aber rigoroser Mentor, der Feedback in einem wissenschaftlichen Ton gibt. Ihr Feedback MUSS detailliert, akademisch und umfassend sein und die Theorie tief integrieren.

**Wissensbasierte Integration:**
Basieren Sie Ihr Feedback auf dem theoretischen Rahmen der empirischen Unterrichtsqualitätsforschung. Verwenden Sie das prozessorientierte Lehr-Lern-Modell (Seidel & Shavelson, 2007) oder die drei Grunddimensionen der Unterrichtsqualität (Klieme, 2006) für Feedback zu Beschreibung und Erklärung. Für die Vorhersage verwenden Sie die Selbstbestimmungstheorie der Motivation (Deci & Ryan, 1993) oder Theorien des kognitiven und konstruktiven Lernens (Atkinson & Shiffrin, 1968; Craik & Lockhart, 1972).

**KRITISCH: Sie MÜSSEN diese Theorien explizit im Format (Autor, Jahr) zitieren. Zitieren Sie KEINE anderen Theorien.**

**OBLIGATORISCHE GEWICHTETE FEEDBACK-STRUKTUR:**
1. **Fokus auf den schwächsten Bereich**: Schreiben Sie 6-8 detaillierte, akademische Sätze NUR für die schwächste Komponente (${weakestComponent}), mit mehreren spezifischen Vorschlägen und tiefen theoretischen Verbindungen.
2. **Stärkere Bereiche**: Für die beiden stärkeren Komponenten schreiben Sie GENAU 3-4 detaillierte Sätze (1 Stärke, 1 Vorschlag, 1 'Warum' mit explizitem Theoriebezug).
3. **Fazit**: Schreiben Sie 2-3 Sätze, die den wichtigsten Entwicklungsbereich zusammenfassen.

**KRITISCHE FOKUS-ANFORDERUNGEN:**
- Konzentrieren Sie sich NUR auf Analysefähigkeiten, nicht auf die Lehrleistung.
- Betonen Sie bei der Beschreibung eine objektive, nicht bewertende Beobachtung.

**FORMATIERUNG:**
- Abschnitte: "#### Beschreibung", "#### Erklärung", "#### Vorhersage", "#### Fazit"
- Unterüberschriften: "Stärke:", "Vorschläge:", "Warum:"`,
        
        'user-friendly German': `Sie sind ein freundlicher Mentor, der Feedback für einen vielbeschäftigten Lehrer gibt, der schnelle, praktische Tipps wünscht.

**Stilrichtlinie - MUSS BEFOLGT WERDEN:**
- **Sprache**: Verwenden Sie einfache, direkte Sprache. Vermeiden Sie akademischen Jargon vollständig.
- **Zitate**: Fügen Sie KEINE Zitate wie (Autor, Jahr) ein.
- **Fokus**: Geben Sie handlungsorientierte Ratschläge. Erklären Sie NICHT die Theorie hinter den Ratschlägen.

**OBLIGATORISCHE PRÄGNANTE FEEDBACK-STRUKTUR:**
1. **Fokus auf den schwächsten Bereich**: Geben Sie für die schwächste Komponente (${weakestComponent}) einen "Gut:"-Abschnitt mit 1-2 Sätzen und einen "Tipp:"-Abschnitt mit einer Stichpunktliste von 2-3 klaren, praktischen Tipps.
2. **Stärkere Bereiche**: Schreiben Sie für die beiden stärkeren Komponenten einen "Gut:"-Abschnitt mit einem Satz und einen "Tipp:"-Abschnitt mit einem praktischen Tipp.
3. **Kein Fazit**: Fügen Sie keinen "Fazit"-Abschnitt hinzu.

**FORMATIERUNG:**
- Abschnitte: "#### Beschreibung", "#### Erklärung", "#### Vorhersage"
- Unterüberschriften: "Gut:", "Tipp:"`
    };
    
    return prompts[promptType] || prompts['academic English'];
}

function formatStructuredFeedback(text, analysisResult) {
    if (!text) return '';

    let formattedText = text.trim().replace(/\r\n/g, '\n').replace(/\*\*(.*?)\*\*/g, '$1');
    const sections = formattedText.split(/####\s*/).filter(s => s.trim().length > 0);

    const sectionMap = {
        'Overall Assessment': 'overall', 'Gesamtbewertung': 'overall',
        'Description': 'description', 'Beschreibung': 'description',
        'Explanation': 'explanation', 'Erklärung': 'explanation',
        'Prediction': 'prediction', 'Vorhersage': 'prediction',
        'Conclusion': 'overall', 'Fazit': 'overall'
    };

    const processedSections = sections.map(sectionText => {
        const lines = sectionText.trim().split('\n');
        const heading = lines.shift().trim();
        let body = lines.join('\n').trim();

        let sectionClass = 'other';
        for (const key in sectionMap) {
            if (heading.toLowerCase().startsWith(key.toLowerCase())) {
                sectionClass = sectionMap[key];
                break;
            }
        }

        const keywords = [
            'Strength:', 'Stärke:', 'Suggestions:', 'Vorschläge:',
            'Why:', 'Warum:', 'Good:', 'Gut:', 'Tip:', 'Tipp:'
        ];

        keywords.forEach(keyword => {
            const regex = new RegExp(`^(${keyword.replace(':', '\\:')})`, 'gm');
            body = body.replace(regex, `<span class="feedback-keyword">${keyword}</span>`);
        });

        body = body.replace(/\n/g, '<br>');

        return `
            <div class="feedback-section feedback-section-${sectionClass}">
                <h4 class="feedback-heading">${heading}</h4>
                <div class="section-content">${body}</div>
            </div>
        `;
    }).join('');

    return processedSections;
}

// ============================================================================
// Database Functions
// ============================================================================

function initSupabase() {
    if (!SUPABASE_URL || !SUPABASE_KEY || SUPABASE_URL.includes('YOUR_') || SUPABASE_KEY.includes('YOUR_')) {
        console.warn('Supabase credentials not set. Running in demo mode.');
        showAlert('Running in demo mode - feedback works, but data won\'t be saved to database.', 'info');
        return null;
    }
    
    try {
        if (typeof window.supabase === 'undefined' || !window.supabase) {
            throw new Error('Supabase library not loaded from CDN.');
        }
        
        if (typeof window.supabase.createClient !== 'function') {
            throw new Error('Supabase createClient function not available.');
        }
        
        const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        if (!client) {
            throw new Error('Failed to create Supabase client instance.');
        }
        
        console.log('✅ Supabase client initialized successfully');
        return client;
    } catch (error) {
        console.error('Error initializing Supabase client:', error);
        showAlert('Database connection failed - running in demo mode. Feedback generation still works!', 'warning');
        return null;
    }
}

async function verifySupabaseConnection(client) {
    if (!client) return;
    
    try {
        const { data, error } = await client
            .from('reflections')
            .select('count')
            .limit(1);
        
        if (error) {
            console.error('Database connection test failed:', error);
            showAlert('Database connection issue - data may not be saved.', 'warning');
        } else {
            console.log('✅ Supabase connection verified');
        }
    } catch (error) {
        console.error('Error verifying Supabase connection:', error);
    }
}

function getOrCreateSessionId() {
    let sessionId = sessionStorage.getItem('session_id');
    
    if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('session_id', sessionId);
        console.log('✅ New session created:', sessionId);
    } else {
        console.log('✅ Existing session found:', sessionId);
    }
    
    return sessionId;
}

async function logEvent(eventType, eventData = {}) {
    if (!supabase || !currentSessionId) {
        console.log(`Event (no DB): ${eventType}`, eventData);
        return;
    }
    
    try {
        // Store user_agent and language in event_data JSONB (schema doesn't have separate columns)
        const enrichedEventData = {
            ...eventData,
            user_agent: navigator.userAgent,
            language: currentLanguage
        };
        
        const { error } = await supabase
            .from('user_events')
            .insert([{
                session_id: currentSessionId,
                reflection_id: eventData.reflection_id || null,
                participant_name: currentParticipant || null,
                event_type: eventType,
                event_data: enrichedEventData,
                timestamp_utc: new Date().toISOString()
            }]);

        if (error) {
            console.error('Error logging event:', error);
        } else {
            console.log(`📝 Event logged: ${eventType}`, enrichedEventData);
        }
    } catch (error) {
        console.error('Error in logEvent:', error);
    }
}

async function storeBinaryClassificationResults(analysisResult) {
    if (!supabase || !currentSessionId || !currentParticipant || !currentVideoId) return;
    
    try {
        const classificationRecords = analysisResult.classificationResults.map(result => ({
            session_id: currentSessionId,
            reflection_id: currentTaskState.currentReflectionId,
            task_id: `video-task-${currentVideoId}`,
            participant_name: currentParticipant,
            video_id: currentVideoId,
            language: currentLanguage,
            window_id: result.window_id,
            window_text: result.window_text,
            description_score: result.description,
            explanation_score: result.explanation,
            prediction_score: result.prediction,
            created_at: new Date().toISOString()
        }));
        
        if (classificationRecords.length > 0) {
            const { data, error } = await supabase
                .from('binary_classifications')
                .insert(classificationRecords);
            
            if (error) {
                console.error('Error storing binary classifications:', error);
            } else {
                console.log(`✅ ${classificationRecords.length} binary classifications stored`);
            }
        }
    } catch (error) {
        console.error('Error in storeBinaryClassificationResults:', error);
    }
}

async function saveFeedbackToDatabase(data) {
    if (!supabase) {
        console.log('No database connection - running in demo mode');
        return;
    }
    
    try {
        const revisionNumber = currentTaskState.revisionCount || 1;
        const parentReflectionId = currentTaskState.parentReflectionId || null;
        
        // Calculate revision time (time since last revision)
        let revisionTimeSeconds = null;
        if (revisionNumber > 1 && currentTaskState.lastRevisionTime) {
            revisionTimeSeconds = (Date.now() - currentTaskState.lastRevisionTime) / 1000;
        }

        const reflectionData = {
            session_id: currentSessionId,
            participant_name: data.participantCode,
            video_id: data.videoSelected,
            language: currentLanguage,
            task_id: `video-task-${data.videoSelected}`,
            reflection_text: data.reflectionText,
            analysis_percentages: {
                raw: data.analysisResult.percentages_raw,
                priority: data.analysisResult.percentages_priority,
                displayed_to_student: data.analysisResult.percentages_raw
            },
            weakest_component: data.analysisResult.weakest_component,
            feedback_extended: data.extendedFeedback,
            feedback_short: data.shortFeedback,
            feedback_raw: data.rawFeedback || null,  // Store raw LLM response
            revision_number: revisionNumber,
            parent_reflection_id: parentReflectionId,
            revision_time_seconds: revisionTimeSeconds,
            created_at: new Date().toISOString()
        };

        const { data: result, error } = await supabase
            .from('reflections')
            .insert([reflectionData])
            .select()
            .single();

        if (error) {
            console.error('Database insert error:', error);
            return;
        }

        currentTaskState.currentReflectionId = result.id;
        currentTaskState.lastRevisionTime = Date.now();  // Track revision time
        
        if (revisionNumber === 1) {
            currentTaskState.parentReflectionId = result.id;
        }
        
        console.log(`✅ Reflection saved to database:`, result.id);
        if (revisionTimeSeconds !== null) {
            console.log(`   Revision time: ${revisionTimeSeconds.toFixed(2)} seconds`);
        }
        
        logEvent('submit_reflection', {
            video_id: data.videoSelected,
            participant_name: data.participantCode,
            language: currentLanguage,
            reflection_id: result.id,
            reflection_length: data.reflectionText.length,
            analysis_percentages_raw: data.analysisResult.percentages_raw,
            analysis_percentages_priority: data.analysisResult.percentages_priority,
            weakest_component: data.analysisResult.weakest_component
        });
        
    } catch (error) {
        console.error('Error saving to database:', error);
    }
}

// Session end tracking
window.addEventListener('beforeunload', () => {
    if (currentTaskState.currentFeedbackType && currentTaskState.currentFeedbackStartTime) {
        endFeedbackViewing(currentTaskState.currentFeedbackType, currentLanguage);
    }
    
    logEvent('session_end', {
        session_duration: Date.now() - performance.timing.navigationStart,
        language: currentLanguage,
        final_page: currentPage,
        video_id: currentVideoId,
        participant_name: currentParticipant || null
    });
});
