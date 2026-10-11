import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Atom,
  BookOpen,
  FolderKanban,
  FileText,
  Video,
  Gamepad2,
  FlaskConical,
  Calculator,
  ClipboardList,
  Star,
  Inbox,
  Settings,
  Plus,
  Search,
  Moon,
  Sun,
  Presentation,
  CheckCircle2,
  Trash2,
  Edit3,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Share2,
  Download,
  Upload,
  Menu,
  X,
  Eye,
  EyeOff,
  Filter,
  ArrowRight,
  HelpCircle,
  Play,
  RotateCcw,
  Tag,
  Copy,
  Layers,
  GraduationCap,
  Save,
  Check,
  List,
  Grid
} from 'lucide-react';

// Seed Data based on Grade 9 Physics Curriculum (Електромагнітні явища)
const INITIAL_CLASS = { id: 'class-9', name: '9 клас' };

const INITIAL_SECTION = {
  id: 'sec-1',
  classId: 'class-9',
  title: 'Розділ 1. Електромагнітні явища',
  description: 'Постійні магніти, магнітне поле, досліди Ерстеда та Ампера, електромагнітна індукція.'
};

const INITIAL_TOPICS = [
  { id: 'top-1', sectionId: 'sec-1', title: '1. Магнітні явища. Постійні магніти. Взаємодія магнітів.', description: 'Властивості постійних магнітів, полюси магнітів, температура Кюрі, магнетит.' },
  { id: 'top-2', sectionId: 'sec-1', title: '2. Магнітне поле. Лінії магнітного поля.', description: 'Графічне зображення магнітного поля, залізні ошурки, замкненість магнітних ліній.' },
  { id: 'top-3', sectionId: 'sec-1', title: '3. Магнітне поле Землі.', description: 'Географічні та магнітні полюси Землі, компас, модель штабового магніту.' },
  { id: 'top-4', sectionId: 'sec-1', title: '4. Сонячна активність та її вплив на магнітне поле Землі.', description: 'Сонячний вітер, магнітосфера, магнітні бурі, Кременчуцька магнітна аномалія.' },
  { id: 'top-5', sectionId: 'sec-1', title: '5. Магнітні явища в атмосфері Землі та космічному просторі.', description: 'Полярне сяйво, магнітні поля планет-гігантів (Юпітер, Сатурн).' },
  { id: 'top-6', sectionId: 'sec-1', title: '6. Вплив магнітного поля на живі організми.', description: 'Магніторецепція птахів та бактерій, біофізичні дослідження.' },
  { id: 'top-7', sectionId: 'sec-1', title: '7. Дослід Ерстеда. Магнітне поле провідника зі струмом.', description: 'Відкриття 1820 року, орієнтувальна дія струму на магнітну стрілку, правило свердлика.' },
  { id: 'top-8', sectionId: 'sec-1', title: '8. Дія магнітного поля на провідник зі струмом та рухомі заряди.', description: 'Взаємодія паралельних струмів, сила Ампера, магнітна взаємодія.' },
  { id: 'top-9', sectionId: 'sec-1', title: '9. Магнітні властивості речовин та їх застосування.', description: 'Діамагнетики, парамагнетики, феромагнетики, магнітожорсткі та магнітом’які матеріали.' },
  { id: 'top-10', sectionId: 'sec-1', title: '10. Електромагніти.', description: 'Будова котушки зі струмом, залізне осердя, правило правої руки, реле.' },
  { id: 'top-11', sectionId: 'sec-1', title: '11. Магнітна левітація.', description: 'Потяги Maglev, ефект Мейснера, надпровідність.' },
  { id: 'top-12', sectionId: 'sec-1', title: '12. Електродвигуни та їх використання.', description: 'Перетворення електричної енергії в механічну, рамка у магнітному полі, колектор.' },
  { id: 'top-13', sectionId: 'sec-1', title: '13. Електровимірювальні прилади.', description: 'Амперметри, вольтметри магнітоелектричної системи, гальванометр.' },
  { id: 'top-14', sectionId: 'sec-1', title: '14. Явище електромагнітної індукції.', description: 'Досліди Майкла Фарадея 1831 року, індукційний струм, генератори, трансформатори.' },
  { id: 'top-15', sectionId: 'sec-1', title: '15. Повторення розділу. Підготовка до контрольної роботи.', description: 'Узагальнення знань з теми "Електромагнітні явища", розв’язування якісних та розрахункових задач.' }
];

const INITIAL_MATERIALS = [
  {
    id: 'mat-1',
    topicId: 'top-1',
    title: 'Презентація: Постійні магніти та їх властивості',
    type: 'Презентація',
    url: 'https://docs.google.com/presentation/d/e/2PACX-1vT-demo/embed',
    provider: 'Google Slides',
    description: 'Демонстраційні слайди з малюнками підковоподібних і штабових магнітів.',
    tags: ['Важливо', 'Демонстрація'],
    visibility: 'Можна демонструвати учням',
    isFavorite: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'mat-2',
    topicId: 'top-7',
    title: 'Відеоурок: Дослід Ганса-Крістіана Ерстеда (1820)',
    type: 'Відео',
    url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    provider: 'YouTube',
    description: 'Анімація та реальний фізичний експеримент із магнітною стрілкою під провідником.',
    tags: ['Цікаве відео', 'Практика'],
    visibility: 'Можна демонструвати учням',
    isFavorite: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'mat-3',
    topicId: 'top-2',
    title: 'Інтерактивна симуляція: Магнітне поле та лінії',
    type: 'Симуляція',
    url: 'https://phet.colorado.edu/sims/html/magnet-and-compass/latest/magnet-and-compass_uk.html',
    provider: 'PhET',
    description: 'Віртуальна лабораторія PhET з компасом та ошурками.',
    tags: ['Інтерактив'],
    visibility: 'Можна демонструвати учням',
    isFavorite: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'mat-4',
    topicId: 'top-14',
    title: 'Квізи Wordwall: Електромагнітна індукція',
    type: 'Квіз',
    url: 'https://wordwall.net/embed/404notfound',
    provider: 'Wordwall',
    description: 'Експрес-опитування для перевірки засвоєння дослідів Фарадея.',
    tags: ['Повторення', 'Практика'],
    visibility: 'Можна демонструвати учням',
    isFavorite: false,
    createdAt: new Date().toISOString()
  }
];

const INITIAL_FORMULAS = [
  {
    id: 'form-1',
    topicId: 'top-8',
    title: 'Сила Ампера',
    latex: 'F_A = I \\cdot B \\cdot L \\cdot \\sin\\alpha',
    explanation: 'Сила, з якою магнітне поле діє на провідник зі струмом довжиною L, розмінщений під кутом α до ліній магнітної індукції B.',
    variables: [
      { symbol: 'I', name: 'Сила струму', unit: 'А' },
      { symbol: 'B', name: 'Магнітна індукція', unit: 'Тл' },
      { symbol: 'L', name: 'Довжина провідника', unit: 'м' },
      { symbol: 'α', name: 'Кут до ліній поля', unit: 'град' }
    ],
    example: 'Обчислити силу, що діє на провідник 0.5 м, струм 2 А, в полі 0.1 Тл під кутом 90°: F_A = 2 * 0.1 * 0.5 * 1 = 0.1 Н.'
  },
  {
    id: 'form-2',
    topicId: 'top-14',
    title: 'Магнітний потік',
    latex: '\\Phi = B \\cdot S \\cdot \\cos\\alpha',
    explanation: 'Скалярна фізична величина, що характеризує потік ліній магнітної індукції B через поверхню площею S.',
    variables: [
      { symbol: 'B', name: 'Магнітна індукція', unit: 'Тл' },
      { symbol: 'S', name: 'Площа контуру', unit: 'м²' },
      { symbol: 'α', name: 'Кут між нормаллю та B', unit: 'град' }
    ],
    example: 'Магнітний потік у Веберах (Вб).'
  }
];

const INITIAL_QUIZZES = [
  {
    id: 'quiz-1',
    topicId: 'top-1',
    title: 'Перевірочний тест: Постійні магніти',
    description: 'Коротке опитування з теми полюсів магніту та точки Кюрі.',
    questions: [
      {
        id: 'q1',
        text: 'Що відбувається з магнітом під час нагрівання до температури Кюрі?',
        options: [
          'Його магнітні властивості підсилюються',
          'Магнітні властивості повністю зникають',
          'Він змінює свій північний полюс на південний',
          'Він стає феромагнетиком'
        ],
        correctAnswer: 1,
        explanation: 'При досягненні температури Кюрі тепловий рух атомів руйнує впорядковану магнітну структуру матеріалу.'
      },
      {
        id: 'q2',
        text: 'Як взаємодіють однойменні полюси двох магнітів?',
        options: [
          'Притягуються',
          'Відштовхуються',
          'Не взаємодіють взагалі',
          'Повертаються на 90 градусів'
        ],
        correctAnswer: 1,
        explanation: 'Однойменні магнітні полюси (N-N або S-S) відштовхуються, різнойменні (N-S) притягуються.'
      }
    ]
  }
];

function detectLinkProvider(url) {
  if (!url) return { provider: 'Веб-ресурс', suggestedType: 'Зовнішнє посилання' };
  const lower = url.toLowerCase();
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
    return { provider: 'YouTube', suggestedType: 'Відео' };
  }
  if (lower.includes('docs.google.com/presentation') || lower.includes('slides.google.com')) {
    return { provider: 'Google Slides', suggestedType: 'Презентація' };
  }
  if (lower.includes('docs.google.com/document')) {
    return { provider: 'Google Docs', suggestedType: 'PDF / Документ' };
  }
  if (lower.includes('docs.google.com/forms')) {
    return { provider: 'Google Forms', suggestedType: 'Тест' };
  }
  if (lower.includes('drive.google.com')) {
    return { provider: 'Google Drive', suggestedType: 'PDF / Документ' };
  }
  if (lower.includes('wordwall.net')) {
    return { provider: 'Wordwall', suggestedType: 'Навчальна гра' };
  }
  if (lower.includes('kahoot.it') || lower.includes('kahoot.com')) {
    return { provider: 'Kahoot', suggestedType: 'Квіз' };
  }
  if (lower.includes('quizizz.com')) {
    return { provider: 'Quizizz', suggestedType: 'Квіз' };
  }
  if (lower.includes('phet.colorado.edu')) {
    return { provider: 'PhET Interactive', suggestedType: 'Симуляція' };
  }
  if (lower.includes('.pdf')) {
    return { provider: 'PDF Документ', suggestedType: 'PDF / Документ' };
  }
  return { provider: 'Веб-сайт', suggestedType: 'Зовнішнє посилання' };
}

export default function App() {
  // Theme State
  const [darkMode, setDarkMode] = useState(true);

  // Core App Navigation & Active Views
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'topics', 'library', 'presentations', 'videos', 'quizzes', 'experiments', 'formulas', 'tests', 'favorites', 'inbox', 'settings'
  const [selectedTopicId, setSelectedTopicId] = useState('top-1');
  const [topicDetailTab, setTopicDetailTab] = useState('overview'); // 'overview', 'theory', 'presentations', 'videos', 'formulas', 'experiments', 'quizzes', 'tests', 'notes'

  // Data States loaded from LocalStorage or seeded defaults
  const [topics, setTopics] = useState(() => {
    const saved = localStorage.getItem('pth_topics');
    return saved ? JSON.parse(saved) : INITIAL_TOPICS;
  });

  const [materials, setMaterials] = useState(() => {
    const saved = localStorage.getItem('pth_materials');
    return saved ? JSON.parse(saved) : INITIAL_MATERIALS;
  });

  const [formulas, setFormulas] = useState(() => {
    const saved = localStorage.getItem('pth_formulas');
    return saved ? JSON.parse(saved) : INITIAL_FORMULAS;
  });

  const [quizzes, setQuizzes] = useState(() => {
    const saved = localStorage.getItem('pth_quizzes');
    return saved ? JSON.parse(saved) : INITIAL_QUIZZES;
  });

  const [notes, setNotes] = useState(() => {
    const saved = localStorage.getItem('pth_notes');
    return saved ? JSON.parse(saved) : {
      'top-1': 'Матеріали з підручника "Фізика 9 клас": Постійні магніти зберігають намагніченість завдяки внутрішній впорядкованій структурі. Головні приклади: підковоподібний та штабовий магніт. Згадати точку Кюрі!'
    };
  });

  const [theoryText, setTheoryText] = useState(() => {
    const saved = localStorage.getItem('pth_theory');
    return saved ? JSON.parse(saved) : {
      'top-1': `<h3>§ 1. Постійні магніти та їхні властивості</h3>
<p>У природі існують речовини, які тривалий час зберігають магнітні властивості. Їх називають <strong>постійними магнітами</strong>.</p>
<p>З давніх-давен люди спостерігали, як шматки магнетиту притягують до себе залізні предмети. Найсильніша магнітна дія проявляється на <em>полюсах магніту</em> (північний N та південний S).</p>
<ul>
  <li>Різнойменні полюси притягуються (N-S).</li>
  <li>Однойменні полюси відштовхуються (N-N, S-S).</li>
  <li>Неможливо одержати магніт тільки з одним полюсом!</li>
  <li>При досягненні <strong>температури Кюрі</strong> магнітні властивості зникають.</li>
</ul>`
    };
  });

  // UI States
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  // Modals
  const [isAddMaterialModalOpen, setIsAddMaterialModalOpen] = useState(false);
  const [isAddTopicModalOpen, setIsAddTopicModalOpen] = useState(false);
  const [isAddFormulaModalOpen, setIsAddFormulaModalOpen] = useState(false);
  const [isQuizCreatorOpen, setIsQuizCreatorOpen] = useState(false);
  const [activeQuizToPlay, setActiveQuizToPlay] = useState(null);

  // Local Storage Synchronization Effect
  useEffect(() => {
    localStorage.setItem('pth_topics', JSON.stringify(topics));
    localStorage.setItem('pth_materials', JSON.stringify(materials));
    localStorage.setItem('pth_formulas', JSON.stringify(formulas));
    localStorage.setItem('pth_quizzes', JSON.stringify(quizzes));
    localStorage.setItem('pth_notes', JSON.stringify(notes));
    localStorage.setItem('pth_theory', JSON.stringify(theoryText));
  }, [topics, materials, formulas, quizzes, notes, theoryText]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const stats = useMemo(() => {
    return {
      topicsCount: topics.length,
      materialsCount: materials.length,
      quizzesCount: materials.filter(m => m.type === 'Квіз' || m.type === 'Навчальна гра').length + quizzes.length,
      presentationsCount: materials.filter(m => m.type === 'Презентація').length
    };
  }, [topics, materials, quizzes]);

  const activeTopic = useMemo(() => {
    return topics.find(t => t.id === selectedTopicId) || topics[0];
  }, [topics, selectedTopicId]);

  // Global Filtered Materials
  const filteredMaterials = useMemo(() => {
    if (!searchQuery.trim()) return materials;
    const q = searchQuery.toLowerCase();
    return materials.filter(m =>
      m.title.toLowerCase().includes(q) ||
      (m.description && m.description.toLowerCase().includes(q)) ||
      m.tags.some(t => t.toLowerCase().includes(q))
    );
  }, [materials, searchQuery]);

  const toggleFavoriteMaterial = (id) => {
    setMaterials(prev => prev.map(m => m.id === id ? { ...m, isFavorite: !m.isFavorite } : m));
    showToast('Статус обраного оновлено!');
  };

  const deleteMaterial = (id) => {
    if (window.confirm('Ви впевнені, що хочете вилучити цей матеріал?')) {
      setMaterials(prev => prev.filter(m => m.id !== id));
      showToast('Матеріал видалено.');
    }
  };

  const assignInboxMaterialToTopic = (materialId, topicId) => {
    setMaterials(prev => prev.map(m => m.id === materialId ? { ...m, topicId } : m));
    showToast('Матеріал успішно прикріплено до теми!');
  };

  // Export Data to JSON File
  const exportDataJSON = () => {
    const exportObject = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      topics,
      materials,
      formulas,
      quizzes,
      notes,
      theoryText
    };
    const blob = new Blob([JSON.stringify(exportObject, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Physics_Teacher_Hub_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Резервну копію успішно експортовано!');
  };

  // Import Data from JSON File
  const handleImportJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.topics && data.materials) {
          setTopics(data.topics);
          setMaterials(data.materials);
          if (data.formulas) setFormulas(data.formulas);
          if (data.quizzes) setQuizzes(data.quizzes);
          if (data.notes) setNotes(data.notes);
          if (data.theoryText) setTheoryText(data.theoryText);
          showToast('Дані успішно імпортовано!');
        } else {
          alert('Помилка: Некоректний формат файлу JSON');
        }
      } catch (err) {
        alert('Помилка зчитування JSON файлу');
      }
    };
    reader.readAsText(file);
  };

  if (isPresentationMode) {
    return (
      <PresentationView
        activeTopic={activeTopic}
        materials={materials.filter(m => m.topicId === activeTopic.id && m.visibility === 'Можна демонструвати учням')}
        theory={theoryText[activeTopic.id] || 'Теорія відсутня'}
        formulas={formulas.filter(f => f.topicId === activeTopic.id)}
        onClose={() => setIsPresentationMode(false)}
      />
    );
  }

  return (
    <div className={`min-h-screen font-sans antialiased transition-colors duration-200 ${darkMode ? 'bg-[#0B1120] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white font-medium rounded-xl shadow-2xl animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Responsive Grid Layout */}
      <div className="flex h-screen overflow-hidden">

        {}
        {/* SIDEBAR Component */}
        <aside className={`${sidebarCollapsed ? 'w-20' : 'w-64'} hidden md:flex flex-col border-r transition-all duration-300 ${darkMode ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-200'}`}>
          
          {/* Logo Brand Header */}
          <div className="p-4 flex items-center justify-between border-b border-slate-800/50">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="p-2.5 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/20 shrink-0">
                <Atom className="w-6 h-6 animate-spin-slow" />
              </div>
              {!sidebarCollapsed && (
                <div className="truncate">
                  <h1 className="font-bold text-base leading-tight tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-300">
                    Physics Hub
                  </h1>
                  <p className="text-xs text-slate-400 truncate">Кабінет учителя фізики</p>
                </div>
              )}
            </div>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60"
              title="Згорнути / Розгорнути"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            <SidebarNavItem
              icon={<BookOpen className="w-5 h-5" />}
              label="Головна"
              active={activeTab === 'dashboard'}
              collapsed={sidebarCollapsed}
              onClick={() => setActiveTab('dashboard')}
            />
            <SidebarNavItem
              icon={<FolderKanban className="w-5 h-5" />}
              label="Мої уроки"
              active={activeTab === 'topics'}
              collapsed={sidebarCollapsed}
              onClick={() => setActiveTab('topics')}
              badge={topics.length}
            />
            <SidebarNavItem
              icon={<Layers className="w-5 h-5" />}
              label="Бібліотека матеріалів"
              active={activeTab === 'library'}
              collapsed={sidebarCollapsed}
              onClick={() => setActiveTab('library')}
            />
            <SidebarNavItem
              icon={<Presentation className="w-5 h-5" />}
              label="Презентації"
              active={activeTab === 'presentations'}
              collapsed={sidebarCollapsed}
              onClick={() => setActiveTab('presentations')}
            />
            <SidebarNavItem
              icon={<Video className="w-5 h-5" />}
              label="Відео"
              active={activeTab === 'videos'}
              collapsed={sidebarCollapsed}
              onClick={() => setActiveTab('videos')}
            />
            <SidebarNavItem
              icon={<Gamepad2 className="w-5 h-5" />}
              label="Квізи та ігри"
              active={activeTab === 'quizzes'}
              collapsed={sidebarCollapsed}
              onClick={() => setActiveTab('quizzes')}
            />
            <SidebarNavItem
              icon={<FlaskConical className="w-5 h-5" />}
              label="Експерименти"
              active={activeTab === 'experiments'}
              collapsed={sidebarCollapsed}
              onClick={() => setActiveTab('experiments')}
            />
            <SidebarNavItem
              icon={<Calculator className="w-5 h-5" />}
              label="Довідник формул"
              active={activeTab === 'formulas'}
              collapsed={sidebarCollapsed}
              onClick={() => setActiveTab('formulas')}
            />
            <SidebarNavItem
              icon={<ClipboardList className="w-5 h-5" />}
              label="Тести та контрольні"
              active={activeTab === 'tests'}
              collapsed={sidebarCollapsed}
              onClick={() => setActiveTab('tests')}
            />
            
            <div className="pt-3 my-2 border-t border-slate-800/60" />

            <SidebarNavItem
              icon={<Star className="w-5 h-5 text-amber-400" />}
              label="Обране"
              active={activeTab === 'favorites'}
              collapsed={sidebarCollapsed}
              onClick={() => setActiveTab('favorites')}
            />
            <SidebarNavItem
              icon={<Inbox className="w-5 h-5 text-indigo-400" />}
              label="Скарбничка"
              active={activeTab === 'inbox'}
              collapsed={sidebarCollapsed}
              onClick={() => setActiveTab('inbox')}
              badge={materials.filter(m => !m.topicId).length}
            />
            <SidebarNavItem
              icon={<Settings className="w-5 h-5" />}
              label="Налаштування"
              active={activeTab === 'settings'}
              collapsed={sidebarCollapsed}
              onClick={() => setActiveTab('settings')}
            />
          </nav>

          {/* Teacher Profile Footer */}
          {!sidebarCollapsed && (
            <div className={`p-4 border-t ${darkMode ? 'border-slate-800/80 bg-slate-900/40' : 'border-slate-200 bg-slate-100/50'}`}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold shadow-md">
                  ФУ
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-medium truncate">Учитель Фізики</p>
                  <p className="text-xs text-slate-400 truncate">9 клас • ЗЗСО</p>
                </div>
              </div>
            </div>
          )}
        </aside>

        {}
        {/* MAIN CONTAINER */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* TOP BAR */}
          <header className={`h-16 border-b px-4 md:px-6 flex items-center justify-between gap-4 z-20 ${darkMode ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-200'}`}>
            
            {/* Left Header Title / Breadcrumbs */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg"
              >
                <Menu className="w-6 h-6" />
              </button>
              
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <span className="hidden sm:inline font-medium text-blue-400">9 клас</span>
                <ChevronRight className="hidden sm:inline w-4 h-4" />
                <span className="font-semibold text-slate-200 truncate">
                  {activeTab === 'dashboard' && 'Головна панель'}
                  {activeTab === 'topics' && activeTopic.title}
                  {activeTab === 'library' && 'Бібліотека матеріалів'}
                  {activeTab === 'formulas' && 'Довідник формул'}
                  {activeTab === 'inbox' && 'Скарбничка нерозподілених матеріалів'}
                  {activeTab === 'quizzes' && 'Квізи та ігри'}
                  {activeTab === 'favorites' && 'Обрані матеріали'}
                  {activeTab === 'settings' && 'Налаштування та Резервне копіювання'}
                </span>
              </div>
            </div>

            {/* Global Search Bar */}
            <div className="flex-1 max-w-md hidden sm:block">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Швидкий пошук тем, формул, відео, матеріалів..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2 text-sm rounded-xl outline-none border transition-all ${
                    darkMode
                      ? 'bg-slate-900 border-slate-700/80 text-slate-200 focus:border-blue-500'
                      : 'bg-slate-100 border-slate-200 text-slate-900 focus:border-blue-600'
                  }`}
                />
              </div>
            </div>

            {/* Top Action Buttons */}
            <div className="flex items-center gap-2 sm:gap-3">
              
              {/* Classroom Presentation Mode Button */}
              <button
                onClick={() => setIsPresentationMode(true)}
                className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-sm font-medium shadow-md shadow-purple-500/20 transition-all"
                title="Увімкнути режим демонстрації на уроці"
              >
                <Presentation className="w-4 h-4" />
                <span className="hidden lg:inline">Режим презентації</span>
              </button>

              {/* Quick Add Button */}
              <button
                onClick={() => setIsAddMaterialModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium shadow-md shadow-blue-500/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Додати матеріал</span>
              </button>

              {/* Theme Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-xl border transition-colors ${
                  darkMode ? 'bg-slate-900 border-slate-700 text-amber-400 hover:bg-slate-800' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
                title="Переключити тему"
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          </header>

          {}
          {/* CONTENT ROUTER AREA */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            
            {/* TAB 1: DASHBOARD */}
            {activeTab === 'dashboard' && (
              <DashboardView
                stats={stats}
                topics={topics}
                materials={materials}
                onSelectTopic={(id) => {
                  setSelectedTopicId(id);
                  setActiveTab('topics');
                }}
                onOpenAddMaterial={() => setIsAddMaterialModalOpen(true)}
                onNavigate={(tab) => setActiveTab(tab)}
                onToggleFavorite={toggleFavoriteMaterial}
              />
            )}

            {/* TAB 2: MY LESSONS & TOPICS */}
            {activeTab === 'topics' && (
              <TopicDetailWorkspace
                topic={activeTopic}
                topics={topics}
                materials={materials.filter(m => m.topicId === activeTopic.id)}
                formulas={formulas.filter(f => f.topicId === activeTopic.id)}
                quizzes={quizzes.filter(q => q.topicId === activeTopic.id)}
                noteText={notes[activeTopic.id] || ''}
                theoryText={theoryText[activeTopic.id] || ''}
                activeSubTab={topicDetailTab}
                onChangeSubTab={setTopicDetailTab}
                onSelectTopic={setSelectedTopicId}
                onSaveNote={(text) => {
                  setNotes(prev => ({ ...prev, [activeTopic.id]: text }));
                  showToast('Нотатку збережено!');
                }}
                onSaveTheory={(text) => {
                  setTheoryText(prev => ({ ...prev, [activeTopic.id]: text }));
                  showToast('Конспект теорії оновлено!');
                }}
                onOpenAddMaterial={() => setIsAddMaterialModalOpen(true)}
                onDeleteMaterial={deleteMaterial}
                onToggleFavorite={toggleFavoriteMaterial}
                darkMode={darkMode}
              />
            )}

            {/* TAB 3: MATERIAL LIBRARY */}
            {activeTab === 'library' && (
              <MaterialLibraryView
                materials={filteredMaterials}
                topics={topics}
                onToggleFavorite={toggleFavoriteMaterial}
                onDelete={deleteMaterial}
                darkMode={darkMode}
              />
            )}

            {/* TAB 4: FORMULA BANK & CALCULATOR */}
            {activeTab === 'formulas' && (
              <FormulaBankView
                formulas={formulas}
                topics={topics}
                onAddFormula={() => setIsAddFormulaModalOpen(true)}
                darkMode={darkMode}
              />
            )}

            {/* TAB 5: INBOX / SKARBNYCHKA */}
            {activeTab === 'inbox' && (
              <QuickSaveInboxView
                inboxMaterials={materials.filter(m => !m.topicId)}
                topics={topics}
                onAssign={assignInboxMaterialToTopic}
                onDelete={deleteMaterial}
                onOpenAddModal={() => setIsAddMaterialModalOpen(true)}
                darkMode={darkMode}
              />
            )}

            {/* TAB 6: QUIZZES AND GAMES */}
            {activeTab === 'quizzes' && (
              <QuizzesAndGamesView
                materials={materials.filter(m => m.type === 'Квіз' || m.type === 'Навчальна гра')}
                quizzes={quizzes}
                topics={topics}
                onOpenQuizCreator={() => setIsQuizCreatorOpen(true)}
                onPlayQuiz={(quiz) => setActiveQuizToPlay(quiz)}
                darkMode={darkMode}
              />
            )}

            {/* TAB 7: PRESENTATIONS, VIDEOS, EXPERIMENTS, TESTS FILTER VIEWS */}
            {['presentations', 'videos', 'experiments', 'tests', 'favorites'].includes(activeTab) && (
              <FilteredCategoryView
                category={activeTab}
                materials={materials}
                topics={topics}
                onToggleFavorite={toggleFavoriteMaterial}
                onDelete={deleteMaterial}
                darkMode={darkMode}
              />
            )}

            {/* TAB 8: SETTINGS & BACKUP */}
            {activeTab === 'settings' && (
              <SettingsView
                onExport={exportDataJSON}
                onImport={handleImportJSON}
                topicsCount={topics.length}
                materialsCount={materials.length}
                darkMode={darkMode}
              />
            )}

          </main>
        </div>
      </div>

      {}
      {/* ADD MATERIAL MODAL */}
      {isAddMaterialModalOpen && (
        <AddMaterialModal
          topics={topics}
          initialTopicId={selectedTopicId}
          onClose={() => setIsAddMaterialModalOpen(false)}
          onSave={(newMat) => {
            setMaterials(prev => [newMat, ...prev]);
            setIsAddMaterialModalOpen(false);
            showToast('Новий матеріал успішно додано!');
          }}
          darkMode={darkMode}
        />
      )}

      {/* ADD FORMULA MODAL */}
      {isAddFormulaModalOpen && (
        <AddFormulaModal
          topics={topics}
          initialTopicId={selectedTopicId}
          onClose={() => setIsAddFormulaModalOpen(false)}
          onSave={(newForm) => {
            setFormulas(prev => [...prev, newForm]);
            setIsAddFormulaModalOpen(false);
            showToast('Формулу збережено до довідника!');
          }}
          darkMode={darkMode}
        />
      )}

      {/* QUIZ PLAYER MODAL */}
      {activeQuizToPlay && (
        <QuizPlayerModal
          quiz={activeQuizToPlay}
          onClose={() => setActiveQuizToPlay(null)}
          darkMode={darkMode}
        />
      )}

      {/* QUIZ CREATOR MODAL */}
      {isQuizCreatorOpen && (
        <QuizCreatorModal
          topics={topics}
          initialTopicId={selectedTopicId}
          onClose={() => setIsQuizCreatorOpen(false)}
          onSave={(newQuiz) => {
            setQuizzes(prev => [newQuiz, ...prev]);
            setIsQuizCreatorOpen(false);
            showToast('Новий квіз створено!');
          }}
          darkMode={darkMode}
        />
      )}
    </div>
  );
}

function SidebarNavItem({ icon, label, active, collapsed, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
        active
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
      }`}
      title={label}
    >
      <div className="shrink-0">{icon}</div>
      {!collapsed && (
        <div className="flex-1 text-left flex items-center justify-between truncate">
          <span className="truncate">{label}</span>
          {badge !== undefined && badge > 0 && (
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
              {badge}
            </span>
          )}
        </div>
      )}
    </button>
  );
}

function DashboardView({ stats, topics, materials, onSelectTopic, onOpenAddMaterial, onNavigate, onToggleFavorite }) {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900/60 via-indigo-900/40 to-purple-900/50 border border-blue-500/30 p-6 md:p-8 shadow-2xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" /> 9 Клас • Фізика України
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-2">
            Вітаємо у Physics Teacher Hub! ⚡
          </h2>
          <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-6">
            Ваш персональний цифровий простір для проведення інтерактивних уроків з фізики. Усі презентації, відео, формули та квізи в одному зручному кабінеті.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('topics')}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl text-sm shadow-lg shadow-blue-500/30 flex items-center gap-2 transition-all"
            >
              <BookOpen className="w-4 h-4" /> Відкрити уроки
            </button>
            <button
              onClick={onOpenAddMaterial}
              className="px-5 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium rounded-xl text-sm flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" /> Додати матеріал
            </button>
          </div>
        </div>
        
        {/* Subtle Decorative Background Graphic */}
        <div className="absolute right-[-20px] bottom-[-20px] opacity-10 pointer-events-none">
          <Atom className="w-80 h-80 text-blue-400" />
        </div>
      </div>

      {/* Dashboard Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Кількість тем" value={stats.topicsCount} icon={<FolderKanban className="w-6 h-6 text-blue-400" />} color="blue" />
        <StatCard title="Усього матеріалів" value={stats.materialsCount} icon={<Layers className="w-6 h-6 text-indigo-400" />} color="indigo" />
        <StatCard title="Квізи та ігри" value={stats.quizzesCount} icon={<Gamepad2 className="w-6 h-6 text-purple-400" />} color="purple" />
        <StatCard title="Презентації" value={stats.presentationsCount} icon={<Presentation className="w-6 h-6 text-emerald-400" />} color="emerald" />
      </div>

      {/* Active Section Banner */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Поточний розділ</span>
            <h3 className="text-lg font-bold text-white">9 клас — Розділ 1. Електромагнітні явища</h3>
            <p className="text-xs text-slate-400">15 розроблених тем з матеріалами та експериментами</p>
          </div>
        </div>
        <button
          onClick={() => onNavigate('topics')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl text-sm flex items-center gap-2 transition-all self-stretch md:self-auto justify-center"
        >
          Перейти до розділу <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Topics Overview List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-blue-400" /> Темы Розділу 1
          </h3>
          <span className="text-xs text-slate-400">{topics.length} тем у програмі</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {topics.slice(0, 6).map((topic, idx) => {
            const count = materials.filter(m => m.topicId === topic.id).length;
            return (
              <div
                key={topic.id}
                onClick={() => onSelectTopic(topic.id)}
                className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-blue-500/50 transition-all cursor-pointer group hover:shadow-xl hover:shadow-blue-500/5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      Тема #{idx + 1}
                    </span>
                    <span className="text-xs text-slate-400">{count} матеріалів</span>
                  </div>
                  <h4 className="font-semibold text-sm text-slate-100 group-hover:text-blue-400 transition-colors line-clamp-2 mb-1">
                    {topic.title}
                  </h4>
                  <p className="text-xs text-slate-400 line-clamp-2">{topic.description}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-blue-400 font-medium">
                  <span>Відкрити тему</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }) {
  return (
    <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
      <div>
        <p className="text-xs font-medium text-slate-400 mb-1">{title}</p>
        <p className="text-2xl font-black text-white">{value}</p>
      </div>
      <div className={`p-3 rounded-xl bg-${color}-500/10 border border-${color}-500/20`}>
        {icon}
      </div>
    </div>
  );
}

function TopicDetailWorkspace({
  topic,
  topics,
  materials,
  formulas,
  quizzes,
  noteText,
  theoryText,
  activeSubTab,
  onChangeSubTab,
  onSelectTopic,
  onSaveNote,
  onSaveTheory,
  onOpenAddMaterial,
  onDeleteMaterial,
  onToggleFavorite,
  darkMode
}) {
  const [editingNote, setEditingNote] = useState(noteText);
  const [editingTheory, setEditingTheory] = useState(theoryText);

  useEffect(() => {
    setEditingNote(noteText);
  }, [noteText]);

  useEffect(() => {
    setEditingTheory(theoryText);
  }, [theoryText]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Topic Switcher Dropdown Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm">
            #{topics.findIndex(t => t.id === topic.id) + 1}
          </div>
          <div>
            <label className="text-xs text-slate-400 block font-medium">Оберіть тему для вивчення:</label>
            <select
              value={topic.id}
              onChange={(e) => onSelectTopic(e.target.value)}
              className="bg-slate-800 text-slate-100 font-semibold text-sm rounded-lg px-3 py-1.5 border border-slate-700 outline-none focus:border-blue-500 max-w-md truncate"
            >
              {topics.map((t, idx) => (
                <option key={t.id} value={t.id}>
                  {idx + 1}. {t.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAddMaterial}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" /> Додати матеріал до теми
          </button>
        </div>
      </div>

      {/* Topic Title & Description */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/90 border border-slate-800">
        <h2 className="text-xl md:text-2xl font-bold text-white mb-2">{topic.title}</h2>
        <p className="text-sm text-slate-300 leading-relaxed">{topic.description}</p>
      </div>

      {/* Topic Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 overflow-x-auto pb-1">
        {[
          { id: 'overview', label: 'Огляд', icon: <BookOpen className="w-4 h-4" /> },
          { id: 'theory', label: 'Теорія', icon: <FileText className="w-4 h-4" /> },
          { id: 'presentations', label: 'Презентації', icon: <Presentation className="w-4 h-4" />, count: materials.filter(m => m.type === 'Презентація').length },
          { id: 'videos', label: 'Відео', icon: <Video className="w-4 h-4" />, count: materials.filter(m => m.type === 'Відео').length },
          { id: 'formulas', label: 'Формули', icon: <Calculator className="w-4 h-4" />, count: formulas.length },
          { id: 'experiments', label: 'Експерименти', icon: <FlaskConical className="w-4 h-4" />, count: materials.filter(m => m.type === 'Симуляція').length },
          { id: 'quizzes', label: 'Квізи та ігри', icon: <Gamepad2 className="w-4 h-4" />, count: materials.filter(m => m.type === 'Квіз' || m.type === 'Навчальна гра').length + quizzes.length },
          { id: 'notes', label: 'Нотатки вчителя', icon: <Edit3 className="w-4 h-4" /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChangeSubTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
              activeSubTab === tab.id
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {}
      {/* SUBTAB 1: OVERVIEW */}
      {activeSubTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
              <h3 className="font-bold text-sm text-white mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" /> Ключові поняття теми
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                Тема охоплює фундаментальні фізичні закони та експериментальні дослідження, описані в підручнику для 9 класу. Скористайтеся вкладками вище для перегляду презентацій, інтерактивних досліджень PhET та формул.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2.5 py-1 rounded-lg text-xs bg-blue-500/10 text-blue-300 border border-blue-500/20">Магнітне поле</span>
                <span className="px-2.5 py-1 rounded-lg text-xs bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">Полюси</span>
                <span className="px-2.5 py-1 rounded-lg text-xs bg-purple-500/10 text-purple-300 border border-purple-500/20">Електромагнетизм</span>
              </div>
            </div>

            {/* Materials List for Topic */}
            <div>
              <h3 className="font-bold text-sm text-white mb-3">Прикріплені матеріали ({materials.length})</h3>
              {materials.length === 0 ? (
                <EmptyState onAdd={onOpenAddMaterial} />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {materials.map(mat => (
                    <MaterialCard key={mat.id} material={mat} onDelete={onDeleteMaterial} onToggleFavorite={onToggleFavorite} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Teacher Note Widget */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 h-fit space-y-3">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-amber-400" /> Нотатка до уроку
            </h3>
            <textarea
              value={editingNote}
              onChange={(e) => setEditingNote(e.target.value)}
              placeholder="Введіть особисті вказівки до уроку..."
              className="w-full h-32 p-3 text-xs bg-slate-950 border border-slate-800 rounded-xl outline-none focus:border-amber-500 text-slate-200 resize-none"
            />
            <button
              onClick={() => onSaveNote(editingNote)}
              className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all"
            >
              <Save className="w-3.5 h-3.5" /> Зберегти нотатку
            </button>
          </div>
        </div>
      )}

      {/* SUBTAB 2: THEORY RICH EDITOR */}
      {activeSubTab === 'theory' && (
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-white">Конспект теорії теми</h3>
            <button
              onClick={() => onSaveTheory(editingTheory)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-500/20"
            >
              <Save className="w-4 h-4" /> Зберегти конспект
            </button>
          </div>
          <div className="prose prose-invert max-w-none text-sm text-slate-200">
            <textarea
              value={editingTheory}
              onChange={(e) => setEditingTheory(e.target.value)}
              className="w-full h-80 p-4 font-mono text-xs bg-slate-950 border border-slate-800 rounded-xl outline-none focus:border-blue-500 text-slate-200 resize-y"
            />
          </div>
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <p className="text-xs text-slate-400 font-semibold mb-2">Попередній перегляд теорії:</p>
            <div
              className="text-sm text-slate-200 leading-relaxed space-y-2"
              dangerouslySetInnerHTML={{ __html: editingTheory }}
            />
          </div>
        </div>
      )}

      {/* SUBTAB: PRESENTATIONS & VIDEOS & EXPERIMENTS LISTING */}
      {['presentations', 'videos', 'experiments', 'quizzes'].includes(activeSubTab) && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {materials.map(mat => (
              <MaterialCard key={mat.id} material={mat} onDelete={onDeleteMaterial} onToggleFavorite={onToggleFavorite} />
            ))}
          </div>
          {materials.length === 0 && <EmptyState onAdd={onOpenAddMaterial} />}
        </div>
      )}

      {/* SUBTAB: FORMULAS LISTING */}
      {activeSubTab === 'formulas' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {formulas.map(f => (
            <FormulaCard key={f.id} formula={f} />
          ))}
          {formulas.length === 0 && (
            <div className="col-span-full p-8 text-center text-slate-400 bg-slate-900/60 rounded-2xl border border-slate-800">
              До цієї теми формул поки немає.
            </div>
          )}
        </div>
      )}

      {/* SUBTAB: PRIVATE TEACHER NOTES */}
      {activeSubTab === 'notes' && (
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 max-w-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-white">Приватні нотатки вчителя</h3>
              <p className="text-xs text-slate-400">Ці записи бачите лише ви. У режимі демонстрації вони приховані.</p>
            </div>
            <button
              onClick={() => onSaveNote(editingNote)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" /> Зберегти
            </button>
          </div>
          <textarea
            value={editingNote}
            onChange={(e) => setEditingNote(e.target.value)}
            className="w-full h-64 p-4 text-sm bg-slate-950 border border-slate-800 rounded-xl outline-none focus:border-amber-500 text-slate-200 resize-none"
            placeholder="Вкажіть особливості проведення експерименту, питання до контрольної роботи чи зауваження..."
          />
        </div>
      )}
    </div>
  );
}

function MaterialCard({ material, onDelete, onToggleFavorite }) {
  const [showEmbed, setShowEmbed] = useState(false);

  return (
    <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-3 group">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            {material.type}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onToggleFavorite(material.id)}
              className={`p-1 rounded-md hover:bg-slate-800 ${material.isFavorite ? 'text-amber-400' : 'text-slate-500'}`}
              title="Обране"
            >
              <Star className="w-4 h-4 fill-current" />
            </button>
            <button
              onClick={() => onDelete(material.id)}
              className="p-1 text-slate-500 hover:text-red-400 rounded-md hover:bg-slate-800"
              title="Видалити"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <h4 className="font-semibold text-sm text-slate-100 mb-1 group-hover:text-blue-400 transition-colors">
          {material.title}
        </h4>
        {material.description && (
          <p className="text-xs text-slate-400 line-clamp-2 mb-2">{material.description}</p>
        )}

        <div className="flex flex-wrap gap-1 mb-2">
          {material.tags.map(t => (
            <span key={t} className="px-2 py-0.5 text-[10px] rounded bg-slate-800 text-slate-300">
              #{t}
            </span>
          ))}
        </div>
      </div>

      {/* Embed or Link Action */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
        <span className="text-[10px] text-slate-500">{material.provider}</span>
        {material.url ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEmbed(!showEmbed)}
              className="text-blue-400 hover:underline flex items-center gap-1 text-xs font-semibold"
            >
              {showEmbed ? 'Сховати' : 'Переглянути'}
            </button>
            <a
              href={material.url}
              target="_blank"
              rel="noreferrer"
              className="text-slate-400 hover:text-white"
              title="Відкрити у новій вкладці"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        ) : null}
      </div>

      {/* Embedded View Popup */}
      {showEmbed && material.url && (
        <div className="mt-3 rounded-xl overflow-hidden border border-slate-700 aspect-video bg-black">
          <iframe
            src={material.url}
            title={material.title}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
    </div>
  );
}

function FormulaCard({ formula }) {
  return (
    <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-sm text-white">{formula.title}</h4>
        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
          LaTeX
        </span>
      </div>

      {/* LaTeX Display */}
      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center font-mono text-lg text-blue-400 font-bold overflow-x-auto">
        {formula.latex}
      </div>

      <p className="text-xs text-slate-300">{formula.explanation}</p>

      {/* Variable definitions */}
      {formula.variables && (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-slate-400 uppercase">Величини:</p>
          <div className="grid grid-cols-2 gap-1 text-xs text-slate-300">
            {formula.variables.map(v => (
              <div key={v.symbol} className="flex items-center gap-1.5">
                <span className="font-bold text-blue-400">{v.symbol}</span> - {v.name} ({v.unit})
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ onAdd }) {
  return (
    <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 space-y-3">
      <div className="w-12 h-12 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
        <Layers className="w-6 h-6" />
      </div>
      <p className="text-sm font-medium text-slate-300">Тут поки немає матеріалів</p>
      <p className="text-xs text-slate-500 max-w-sm mx-auto">Додайте перший навчальний матеріал, відео чи презентацію до цієї теми!</p>
      <button
        onClick={onAdd}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5"
      >
        <Plus className="w-4 h-4" /> Додати матеріал
      </button>
    </div>
  );
}

function FormulaBankView({ formulas, topics, onAddFormula, darkMode }) {
  // Ampere Force Calculator State
  const [I, setI] = useState(2);
  const [B, setB] = useState(0.1);
  const [L, setL] = useState(0.5);
  const [angle, setAngle] = useState(90);

  const ampereForce = useMemo(() => {
    const rad = (angle * Math.PI) / 180;
    return (I * B * L * Math.sin(rad)).toFixed(3);
  }, [I, B, L, angle]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calculator className="w-6 h-6 text-blue-400" /> Довідник фізичних формул
          </h2>
          <p className="text-xs text-slate-400">Збірник формул з електромагнетизму для 9 класу</p>
        </div>
        <button
          onClick={onAddFormula}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" /> Додати формулу
        </button>
      </div>

      {/* Interactive Physics Calculator Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-950/60 to-indigo-950/60 border border-blue-500/30 space-y-4">
        <h3 className="font-bold text-base text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-400" /> Калькулятор Сили Ампера (F_A = I · B · L · sin α)
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Сила струму (I, А)</label>
            <input
              type="number"
              value={I}
              onChange={(e) => setI(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Магнітна індукція (B, Тл)</label>
            <input
              type="number"
              value={B}
              onChange={(e) => setB(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Довжина (L, м)</label>
            <input
              type="number"
              value={L}
              onChange={(e) => setL(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Кут α (градуси)</label>
            <input
              type="number"
              value={angle}
              onChange={(e) => setAngle(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white"
            />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-300">Розрахована Сила Ампера:</span>
          <span className="text-2xl font-black text-emerald-400">{ampereForce} Н</span>
        </div>
      </div>

      {/* Formula List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {formulas.map(f => (
          <FormulaCard key={f.id} formula={f} />
        ))}
      </div>
    </div>
  );
}

function MaterialLibraryView({ materials, topics, onToggleFavorite, onDelete, darkMode }) {
  const [selectedType, setSelectedType] = useState('Всі');

  const filtered = useMemo(() => {
    if (selectedType === 'Всі') return materials;
    return materials.filter(m => m.type === selectedType);
  }, [materials, selectedType]);

  const types = ['Всі', 'Презентація', 'Відео', 'Симуляція', 'Квіз', 'Навчальна гра', 'PDF / Документ'];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-indigo-400" /> Централізована бібліотека
          </h2>
          <p className="text-xs text-slate-400">Усі збережені навчальні ресурси по всіх темах</p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {types.map(t => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                selectedType === t
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(mat => (
          <MaterialCard key={mat.id} material={mat} onDelete={onDelete} onToggleFavorite={onToggleFavorite} />
        ))}
      </div>
    </div>
  );
}

function QuickSaveInboxView({ inboxMaterials, topics, onAssign, onDelete, onOpenAddModal, darkMode }) {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950 to-slate-900 border border-indigo-500/30 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Inbox className="w-6 h-6 text-indigo-400" /> Скарбничка нерозподілених матеріалів
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Зберігайте цікаві посилання чи нотатки без прив'язки до теми, а пізніше розподіліть їх по уроках!
          </p>
        </div>
        <button
          onClick={onOpenAddModal}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" /> Додати до скарбнички
        </button>
      </div>

      {inboxMaterials.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 space-y-3">
          <Inbox className="w-10 h-10 mx-auto text-slate-600" />
          <p className="text-sm font-semibold text-slate-300">Скарбничка порожня</p>
          <p className="text-xs text-slate-500">Усі ваші збережені матеріали вже розподілені по темах.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {inboxMaterials.map(mat => (
            <div key={mat.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {mat.type}
                </span>
                <h4 className="font-semibold text-sm text-white mt-1">{mat.title}</h4>
                <p className="text-xs text-slate-400">{mat.url}</p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  onChange={(e) => onAssign(mat.id, e.target.value)}
                  defaultValue=""
                  className="bg-slate-800 text-xs text-slate-200 px-3 py-2 rounded-xl border border-slate-700 outline-none focus:border-indigo-500"
                >
                  <option value="" disabled>Прикріпити до теми...</option>
                  {topics.map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
                <button
                  onClick={() => onDelete(mat.id)}
                  className="p-2 text-slate-500 hover:text-red-400 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QuizzesAndGamesView({ materials, quizzes, topics, onOpenQuizCreator, onPlayQuiz, darkMode }) {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Gamepad2 className="w-6 h-6 text-purple-400" /> Інтерактивні квізи та ігри
          </h2>
          <p className="text-xs text-slate-400">Wordwall, Kahoot, Quizizz та власні інтерактивні тести</p>
        </div>
        <button
          onClick={onOpenQuizCreator}
          className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-purple-500/20"
        >
          <Plus className="w-4 h-4" /> Створити власний квіз
        </button>
      </div>

      {/* Internal Interactive Quizzes */}
      <div>
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" /> Власні інтерактивні тести ({quizzes.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quizzes.map(quiz => (
            <div key={quiz.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <h4 className="font-bold text-base text-white">{quiz.title}</h4>
              <p className="text-xs text-slate-300">{quiz.description}</p>
              <p className="text-[10px] text-slate-400">{quiz.questions.length} питань</p>
              <button
                onClick={() => onPlayQuiz(quiz)}
                className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" /> Запустити тест на уроці
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* External Game Links */}
      <div>
        <h3 className="text-sm font-bold text-white mb-3">Зовнішні ігри та Kahoot/Wordwall</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {materials.map(mat => (
            <MaterialCard key={mat.id} material={mat} onDelete={() => {}} onToggleFavorite={() => {}} />
          ))}
        </div>
      </div>
    </div>
  );
}

function FilteredCategoryView({ category, materials, topics, onToggleFavorite, onDelete, darkMode }) {
  const titles = {
    presentations: 'Збережені презентації',
    videos: 'Навчальні відеоуроки',
    experiments: 'Віртуальні експерименти та PhET',
    tests: 'Тести та контрольні роботи',
    favorites: 'Обрані навчальні матеріали'
  };

  const filtered = useMemo(() => {
    if (category === 'presentations') return materials.filter(m => m.type === 'Презентація');
    if (category === 'videos') return materials.filter(m => m.type === 'Відео');
    if (category === 'experiments') return materials.filter(m => m.type === 'Симуляція');
    if (category === 'tests') return materials.filter(m => m.type === 'Тест' || m.type === 'Контрольна робота');
    if (category === 'favorites') return materials.filter(m => m.isFavorite);
    return materials;
  }, [category, materials]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-white">{titles[category]}</h2>
        <p className="text-xs text-slate-400">Знайдено {filtered.length} матеріалів</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(mat => (
          <MaterialCard key={mat.id} material={mat} onDelete={onDelete} onToggleFavorite={onToggleFavorite} />
        ))}
      </div>
    </div>
  );
}

function SettingsView({ onExport, onImport, topicsCount, materialsCount, darkMode }) {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-slate-400" /> Налаштування та Резервне копіювання
        </h2>
        <p className="text-xs text-slate-400">Керування збереженими даними кабінету вчителя</p>
      </div>

      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
        <div>
          <h3 className="font-bold text-base text-white mb-1">Експорт та Імпорт даних (JSON)</h3>
          <p className="text-xs text-slate-400">
            Збережіть повну копію ваших розробок уроків, формул та квізів на комп'ютер для перенесення на інший пристрій.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={onExport}
            className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
          >
            <Download className="w-4 h-4" /> Експортувати резервну копію
          </button>

          <label className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all">
            <Upload className="w-4 h-4" /> Імпортувати з файлу JSON
            <input type="file" accept=".json" onChange={onImport} className="hidden" />
          </label>
        </div>

        <div className="pt-4 border-t border-slate-800 text-xs text-slate-400 space-y-1">
          <p>• Усього тем у базі: <strong className="text-slate-200">{topicsCount}</strong></p>
          <p>• Збережених матеріалів: <strong className="text-slate-200">{materialsCount}</strong></p>
        </div>
      </div>
    </div>
  );
}

function PresentationView({ activeTopic, materials, theory, formulas, onClose }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = useMemo(() => {
    const list = [
      { type: 'title', title: activeTopic.title, content: activeTopic.description },
      { type: 'theory', title: 'Теорія уроку', content: theory }
    ];
    materials.forEach(m => {
      list.push({ type: 'material', title: m.title, material: m });
    });
    formulas.forEach(f => {
      list.push({ type: 'formula', title: `Формула: ${f.title}`, formula: f });
    });
    return list;
  }, [activeTopic, materials, theory, formulas]);

  const slide = slides[currentSlide] || slides[0];

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col justify-between p-6">
      
      {/* Top Header Controls */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs text-blue-400 uppercase font-bold tracking-wider">Демонстрація на уроці</span>
          <h2 className="text-lg font-bold">{activeTopic.title}</h2>
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl flex items-center gap-2"
        >
          <X className="w-4 h-4" /> Вийти з презентації
        </button>
      </div>

      {/* Main Slide Screen Display */}
      <div className="flex-1 flex items-center justify-center p-8 max-w-5xl mx-auto w-full">
        {slide.type === 'title' && (
          <div className="text-center space-y-4 animate-fade-in">
            <h1 className="text-4xl font-black text-blue-400">{slide.title}</h1>
            <p className="text-xl text-slate-300">{slide.content}</p>
          </div>
        )}

        {slide.type === 'theory' && (
          <div
            className="prose prose-invert prose-lg max-w-none text-slate-200"
            dangerouslySetInnerHTML={{ __html: slide.content }}
          />
        )}

        {slide.type === 'material' && (
          <div className="w-full space-y-4 text-center">
            <h2 className="text-2xl font-bold">{slide.title}</h2>
            {slide.material.url ? (
              <div className="aspect-video w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-900">
                <iframe src={slide.material.url} className="w-full h-full" title={slide.title} allowFullScreen />
              </div>
            ) : (
              <p className="text-slate-400">{slide.material.description}</p>
            )}
          </div>
        )}

        {slide.type === 'formula' && (
          <div className="text-center space-y-6">
            <h2 className="text-3xl font-bold text-slate-100">{slide.formula.title}</h2>
            <div className="p-8 bg-slate-900 border border-blue-500/40 rounded-3xl font-mono text-4xl text-blue-400 font-bold">
              {slide.formula.latex}
            </div>
            <p className="text-lg text-slate-300">{slide.formula.explanation}</p>
          </div>
        )}
      </div>

      {/* Slide Navigation Footer */}
      <div className="flex items-center justify-between border-t border-slate-800 pt-4 text-sm">
        <button
          disabled={currentSlide === 0}
          onClick={() => setCurrentSlide(c => Math.max(0, c - 1))}
          className="px-5 py-2.5 bg-slate-800 disabled:opacity-30 rounded-xl font-semibold"
        >
          Попередній слайд
        </button>

        <span className="text-slate-400 font-mono">
          Слайд {currentSlide + 1} з {slides.length}
        </span>

        <button
          disabled={currentSlide === slides.length - 1}
          onClick={() => setCurrentSlide(c => Math.min(slides.length - 1, c + 1))}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 rounded-xl font-semibold"
        >
          Наступний слайд
        </button>
      </div>
    </div>
  );
}

function AddMaterialModal({ topics, initialTopicId, onClose, onSave, darkMode }) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState('Презентація');
  const [provider, setProvider] = useState('Google Slides');
  const [topicId, setTopicId] = useState(initialTopicId || '');
  const [description, setDescription] = useState('');
  const [tagsText, setTagsText] = useState('Важливо');

  const handleUrlChange = (e) => {
    const val = e.target.value;
    setUrl(val);
    const detected = detectLinkProvider(val);
    setProvider(detected.provider);
    setType(detected.suggestedType);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return alert('Вкажіть назву матеріалу');

    const newMaterial = {
      id: `mat-${Date.now()}`,
      topicId: topicId || null,
      title,
      url,
      type,
      provider,
      description,
      tags: tagsText.split(',').map(t => t.trim()).filter(Boolean),
      visibility: 'Можна демонструвати учням',
      isFavorite: false,
      createdAt: new Date().toISOString()
    };

    onSave(newMaterial);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 text-white">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="font-bold text-base flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-400" /> Додати навчальний матеріал
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">URL ресурсу (автовизначення провайдера):</label>
            <input
              type="url"
              placeholder="https://www.youtube.com/watch?... або Google Slides link"
              value={url}
              onChange={handleUrlChange}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl outline-none focus:border-blue-500 text-slate-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Тип матеріалу:</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl outline-none text-slate-200"
              >
                {['Презентація', 'Відео', 'PDF / Документ', 'Квіз', 'Навчальна гра', 'Симуляція', 'Тест'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Провайдер:</label>
              <input
                type="text"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl outline-none text-slate-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Назва матеріалу *:</label>
            <input
              type="text"
              required
              placeholder="наприклад: Презентація: Досліди Ерстеда"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl outline-none focus:border-blue-500 text-slate-200"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Прив'язати до теми:</label>
            <select
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl outline-none text-slate-200"
            >
              <option value="">-- Без теми (Зберегти до Скарбнички) --</option>
              {topics.map((t, idx) => (
                <option key={t.id} value={t.id}>{idx + 1}. {t.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Опис матеріалу:</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Короткі вказівки до використання ресурсу..."
              className="w-full h-20 p-3 bg-slate-950 border border-slate-800 rounded-xl outline-none text-slate-200 resize-none"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Теги (через кому):</label>
            <input
              type="text"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="Повторення, Практика, Важливо"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl outline-none text-slate-200"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
            >
              Скасувати
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold shadow-md shadow-blue-500/20"
            >
              Зберегти матеріал
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddFormulaModal({ topics, initialTopicId, onClose, onSave, darkMode }) {
  const [title, setTitle] = useState('');
  const [latex, setLatex] = useState('');
  const [explanation, setExplanation] = useState('');
  const [topicId, setTopicId] = useState(initialTopicId || topics[0]?.id || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || !latex) return alert('Заповніть назву та вираз');

    onSave({
      id: `form-${Date.now()}`,
      topicId,
      title,
      latex,
      explanation,
      variables: []
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 text-white">
        <h3 className="font-bold text-base flex items-center gap-2">
          <Calculator className="w-5 h-5 text-blue-400" /> Додати нову формулу
        </h3>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Назва формули:</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="наприклад: Закон індукції Фарадея"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Вираз LaTeX:</label>
            <input
              type="text"
              required
              value={latex}
              onChange={(e) => setLatex(e.target.value)}
              placeholder="\mathcal{E}_i = -\frac{\Delta \Phi}{\Delta t}"
              className="w-full px-3 py-2 font-mono bg-slate-950 border border-slate-800 rounded-xl text-blue-400"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Пояснення величин:</label>
            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              className="w-full h-20 p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold">
              Скасувати
            </button>
            <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-xl font-semibold">
              Зберегти
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function QuizCreatorModal({ topics, initialTopicId, onClose, onSave, darkMode }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [topicId, setTopicId] = useState(initialTopicId || topics[0]?.id || '');
  const [qText, setQText] = useState('');
  const [opt1, setOpt1] = useState('');
  const [opt2, setOpt2] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || !qText) return alert('Заповніть назву та перше питання');

    const newQuiz = {
      id: `quiz-${Date.now()}`,
      topicId,
      title,
      description,
      questions: [
        {
          id: 'q1',
          text: qText,
          options: [opt1 || 'Варіант 1', opt2 || 'Варіант 2'],
          correctAnswer: 0,
          explanation: 'Правильна відповідь'
        }
      ]
    };

    onSave(newQuiz);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 text-white">
        <h3 className="font-bold text-base flex items-center gap-2">
          <Gamepad2 className="w-5 h-5 text-purple-400" /> Конструктор квізу
        </h3>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Назва квізу:</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="наприклад: Експрес-контроль з магнітних явищ"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Питання #1:</label>
            <input
              type="text"
              required
              value={qText}
              onChange={(e) => setQText(e.target.value)}
              placeholder="Текст запитання..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={opt1}
              onChange={(e) => setOpt1(e.target.value)}
              placeholder="Варіант 1 (Правильний)"
              className="px-3 py-2 bg-slate-950 border border-emerald-500/50 rounded-xl text-slate-200"
            />
            <input
              type="text"
              value={opt2}
              onChange={(e) => setOpt2(e.target.value)}
              placeholder="Варіант 2"
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold">
              Скасувати
            </button>
            <button type="submit" className="px-5 py-2 bg-purple-600 text-white rounded-xl font-semibold">
              Створити квіз
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function QuizPlayerModal({ quiz, onClose, darkMode }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const q = quiz.questions[currentIdx];

  const handleSelect = (idx) => {
    if (selectedOpt !== null) return;
    setSelectedOpt(idx);
    if (idx === q.correctAnswer) {
      setScore(s => s + 1);
    }
  };

  const handleNext = () => {
    setSelectedOpt(null);
    if (currentIdx < quiz.questions.length - 1) {
      setCurrentIdx(c => c + 1);
    } else {
      setShowResult(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 text-white">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="font-bold text-base text-purple-400">{quiz.title}</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!showResult ? (
          <div className="space-y-4">
            <div className="flex justify-between text-xs text-slate-400 font-mono">
              <span>Питання {currentIdx + 1} з {quiz.questions.length}</span>
              <span>Балів: {score}</span>
            </div>

            <h4 className="text-base font-bold text-white">{q.text}</h4>

            <div className="space-y-2">
              {q.options.map((opt, idx) => {
                let color = 'bg-slate-950 border-slate-800 text-slate-200';
                if (selectedOpt !== null) {
                  if (idx === q.correctAnswer) color = 'bg-emerald-950 border-emerald-500 text-emerald-200';
                  else if (idx === selectedOpt) color = 'bg-rose-950 border-rose-500 text-rose-200';
                }
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelect(idx)}
                    className={`w-full p-3.5 text-left text-xs rounded-xl border font-medium transition-all ${color}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            {selectedOpt !== null && (
              <div className="p-3 rounded-xl bg-blue-950/50 border border-blue-500/30 text-xs text-blue-300">
                {q.explanation}
              </div>
            )}

            {selectedOpt !== null && (
              <button
                onClick={handleNext}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold"
              >
                {currentIdx < quiz.questions.length - 1 ? 'Наступне питання' : 'Завершити тест'}
              </button>
            )}
          </div>
        ) : (
          <div className="text-center space-y-4 py-4">
            <Sparkles className="w-12 h-12 text-amber-400 mx-auto" />
            <h4 className="text-2xl font-bold text-white">Тест завершено!</h4>
            <p className="text-sm text-slate-300">
              Результат учнів: <span className="font-bold text-emerald-400">{score}</span> з {quiz.questions.length} правильно!
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold"
            >
              Закрити
            </button>
          </div>
        )}
      </div>
    </div>
  );
}