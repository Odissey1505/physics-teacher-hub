import React, { useState, useEffect, useMemo } from 'react';
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
  Download,
  Upload,
  Menu,
  X,
  Layers,
  GraduationCap,
  Save,
  ArrowRight,
  Play
} from 'lucide-react';

const INITIAL_SECTION = {
  id: 'sec-1',
  classId: 'class-9',
  title: 'Розділ 1. Електромагнітні явища',
  description: 'Постійні магніти, магнітне поле, досліди Ерстеда та Ампера, електромагнітна індукція (Максимович З. та ін.).'
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
    url: 'https://9klas.academiabook.club/fizyka/f1_2',
    provider: 'Academia LMS',
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
    url: 'https://9klas.academiabook.club/fizyka/f7_1',
    provider: 'Academia LMS',
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
    title: 'Квізи LearningApps: Електромагнітна індукція',
    type: 'Квіз',
    url: 'https://learningapps.org/watch?v=pvb83ac9n25',
    provider: 'LearningApps',
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
    explanation: 'Сила, з якою магнітне поле діє на провідник зі струмом довжиною L, розміщений під кутом α до ліній магнітної індукції B.',
    variables: [
      { symbol: 'I', name: 'Сила струму', unit: 'А' },
      { symbol: 'B', name: 'Магнітна індукція', unit: 'Тл' },
      { symbol: 'L', name: 'Довжина провідника', unit: 'м' },
      { symbol: 'α', name: 'Кут до ліній поля', unit: 'град' }
    ]
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
    ]
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
        explanation: 'Одногойменні магнітні полюси (N-N або S-S) відштовхуються, різнойменні (N-S) притягуються.'
      }
    ]
  }
];

function detectLinkProvider(url) {
  if (!url) return { provider: 'Веб-ресурс', suggestedType: 'Зовнішнє посилання' };
  const lower = url.toLowerCase();
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return { provider: 'YouTube', suggestedType: 'Відео' };
  if (lower.includes('docs.google.com/presentation') || lower.includes('slides.google.com')) return { provider: 'Google Slides', suggestedType: 'Презентація' };
  if (lower.includes('learningapps.org')) return { provider: 'LearningApps', suggestedType: 'Навчальна гра' };
  if (lower.includes('phet.colorado.edu')) return { provider: 'PhET Interactive', suggestedType: 'Симуляція' };
  if (lower.includes('academiabook.club')) return { provider: 'Academia LMS', suggestedType: 'Презентація' };
  return { provider: 'Веб-сайт', suggestedType: 'Зовнішнє посилання' };
}

export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedTopicId, setSelectedTopicId] = useState('top-1');
  const [topicDetailTab, setTopicDetailTab] = useState('overview');

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
      'top-1': 'Матеріали з підручника "Фізика 9 клас": Постійні магніти зберігають намагніченість завдяки внутрішній впорядкованій структурі. Згадати точку Кюрі!'
    };
  });

  const [theoryText, setTheoryText] = useState(() => {
    const saved = localStorage.getItem('pth_theory');
    return saved ? JSON.parse(saved) : {
      'top-1': `<h3>§ 1. Постійні магніти та їхні властивості</h3><p>У природі існують речовини, які тривалий час зберігають магнітні властивості. Їх називають <strong>постійними магнітами</strong>.</p>`
    };
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  const [isAddMaterialModalOpen, setIsAddMaterialModalOpen] = useState(false);
  const [isAddFormulaModalOpen, setIsAddFormulaModalOpen] = useState(false);
  const [activeQuizToPlay, setActiveQuizToPlay] = useState(null);

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
    setTimeout(() => setToastMessage(null), 3000);
  };

  const stats = useMemo(() => ({
    topicsCount: topics.length,
    materialsCount: materials.length,
    quizzesCount: materials.filter(m => m.type === 'Квіз' || m.type === 'Навчальна гра').length + quizzes.length,
    presentationsCount: materials.filter(m => m.type === 'Презентація').length
  }), [topics, materials, quizzes]);

  const activeTopic = useMemo(() => topics.find(t => t.id === selectedTopicId) || topics[0], [topics, selectedTopicId]);

  const filteredMaterials = useMemo(() => {
    if (!searchQuery.trim()) return materials;
    const q = searchQuery.toLowerCase();
    return materials.filter(m => m.title.toLowerCase().includes(q) || m.tags.some(t => t.toLowerCase().includes(q)));
  }, [materials, searchQuery]);

  const toggleFavoriteMaterial = (id) => {
    setMaterials(prev => prev.map(m => m.id === id ? { ...m, isFavorite: !m.isFavorite } : m));
    showToast('Статус обраного оновлено!');
  };

  const deleteMaterial = (id) => {
    if (window.confirm('Вилучити цей матеріал?')) {
      setMaterials(prev => prev.filter(m => m.id !== id));
      showToast('Матеріал видалено.');
    }
  };

  const exportDataJSON = () => {
    const exportObject = { topics, materials, formulas, quizzes, notes, theoryText };
    const blob = new Blob([JSON.stringify(exportObject, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Physics_Teacher_Hub_Backup.json`;
    a.click();
    showToast('Резервну копію експортовано!');
  };

  if (isPresentationMode) {
    return (
      <PresentationView
        activeTopic={activeTopic}
        materials={materials.filter(m => m.topicId === activeTopic.id)}
        theory={theoryText[activeTopic.id] || 'Теорія відсутня'}
        formulas={formulas.filter(f => f.topicId === activeTopic.id)}
        onClose={() => setIsPresentationMode(false)}
      />
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-200 ${darkMode ? 'bg-[#0B1120] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white font-medium rounded-xl shadow-2xl animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className={`${sidebarCollapsed ? 'w-20' : 'w-64'} hidden md:flex flex-col border-r ${darkMode ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="p-4 flex items-center justify-between border-b border-slate-800/50">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-lg shrink-0">
                <Atom className="w-6 h-6 animate-spin-slow" />
              </div>
              {!sidebarCollapsed && (
                <div className="truncate">
                  <h1 className="font-bold text-base bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-300">Physics Hub</h1>
                  <p className="text-xs text-slate-400">Кабінет учителя фізики</p>
                </div>
              )}
            </div>
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
              <Menu className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            <SidebarNavItem icon={<BookOpen className="w-5 h-5" />} label="Головна" active={activeTab === 'dashboard'} collapsed={sidebarCollapsed} onClick={() => setActiveTab('dashboard')} />
            <SidebarNavItem icon={<FolderKanban className="w-5 h-5" />} label="Мої уроки" active={activeTab === 'topics'} collapsed={sidebarCollapsed} onClick={() => setActiveTab('topics')} badge={topics.length} />
            <SidebarNavItem icon={<Layers className="w-5 h-5" />} label="Бібліотека" active={activeTab === 'library'} collapsed={sidebarCollapsed} onClick={() => setActiveTab('library')} />
            <SidebarNavItem icon={<Calculator className="w-5 h-5" />} label="Формули" active={activeTab === 'formulas'} collapsed={sidebarCollapsed} onClick={() => setActiveTab('formulas')} />
            <SidebarNavItem icon={<Gamepad2 className="w-5 h-5" />} label="Квізи та ігри" active={activeTab === 'quizzes'} collapsed={sidebarCollapsed} onClick={() => setActiveTab('quizzes')} />
            <SidebarNavItem icon={<Star className="w-5 h-5 text-amber-400" />} label="Обране" active={activeTab === 'favorites'} collapsed={sidebarCollapsed} onClick={() => setActiveTab('favorites')} />
            <SidebarNavItem icon={<Inbox className="w-5 h-5 text-indigo-400" />} label="Скарбничка" active={activeTab === 'inbox'} collapsed={sidebarCollapsed} onClick={() => setActiveTab('inbox')} badge={materials.filter(m => !m.topicId).length} />
            <SidebarNavItem icon={<Settings className="w-5 h-5" />} label="Налаштування" active={activeTab === 'settings'} collapsed={sidebarCollapsed} onClick={() => setActiveTab('settings')} />
          </nav>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className={`h-16 border-b px-6 flex items-center justify-between gap-4 ${darkMode ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span className="font-medium text-blue-400">9 клас</span>
              <ChevronRight className="w-4 h-4" />
              <span className="font-semibold text-slate-200">{activeTab === 'dashboard' ? 'Головна панель' : activeTopic.title}</span>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={() => setIsPresentationMode(true)} className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-sm font-medium shadow-md">
                <Presentation className="w-4 h-4" /> Режим презентації
              </button>
              <button onClick={() => setIsAddMaterialModalOpen(true)} className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium shadow-md">
                <Plus className="w-4 h-4" /> Додати матеріал
              </button>
              <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-xl border bg-slate-900 border-slate-700 text-amber-400">
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-6">
            {activeTab === 'dashboard' && (
              <DashboardView
                stats={stats}
                topics={topics}
                materials={materials}
                onSelectTopic={(id) => { setSelectedTopicId(id); setActiveTab('topics'); }}
                onOpenAddMaterial={() => setIsAddMaterialModalOpen(true)}
              />
            )}

            {activeTab === 'topics' && (
              <TopicDetailWorkspace
                topic={activeTopic}
                topics={topics}
                materials={materials.filter(m => m.topicId === activeTopic.id)}
                formulas={formulas.filter(f => f.topicId === activeTopic.id)}
                activeSubTab={topicDetailTab}
                onChangeSubTab={setTopicDetailTab}
                onSelectTopic={setSelectedTopicId}
                onOpenAddMaterial={() => setIsAddMaterialModalOpen(true)}
                onDeleteMaterial={deleteMaterial}
                onToggleFavorite={toggleFavoriteMaterial}
              />
            )}

            {activeTab === 'formulas' && (
              <FormulaBankView formulas={formulas} onAddFormula={() => setIsAddFormulaModalOpen(true)} />
            )}

            {activeTab === 'settings' && (
              <SettingsView onExport={exportDataJSON} topicsCount={topics.length} materialsCount={materials.length} />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function SidebarNavItem({ icon, label, active, collapsed, onClick, badge }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'}`}>
      <div className="shrink-0">{icon}</div>
      {!collapsed && (
        <div className="flex-1 text-left flex items-center justify-between truncate">
          <span>{label}</span>
          {badge > 0 && <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-300">{badge}</span>}
        </div>
      )}
    </button>
  );
}

function DashboardView({ stats, topics, materials, onSelectTopic, onOpenAddMaterial }) {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="p-8 rounded-2xl bg-gradient-to-r from-blue-900/60 to-purple-900/50 border border-blue-500/30">
        <h2 className="text-3xl font-extrabold text-white mb-2">Вітаємо у Physics Teacher Hub! ⚡</h2>
        <p className="text-slate-300 text-sm max-w-2xl mb-6">Персональний кабінет учителя для 9 класу за програмою з фізики (Електромагнітні явища).</p>
        <button onClick={onOpenAddMaterial} className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-xl text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> Додати матеріал
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Кількість тем" value={stats.topicsCount} icon={<FolderKanban className="w-6 h-6 text-blue-400" />} />
        <StatCard title="Усього матеріалів" value={stats.materialsCount} icon={<Layers className="w-6 h-6 text-indigo-400" />} />
        <StatCard title="Квізи та ігри" value={stats.quizzesCount} icon={<Gamepad2 className="w-6 h-6 text-purple-400" />} />
        <StatCard title="Презентації" value={stats.presentationsCount} icon={<Presentation className="w-6 h-6 text-emerald-400" />} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {topics.slice(0, 6).map((topic, idx) => (
          <div key={topic.id} onClick={() => onSelectTopic(topic.id)} className="p-4 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:border-blue-500/50">
            <span className="text-xs text-blue-400 font-semibold">Тема #{idx + 1}</span>
            <h4 className="font-semibold text-sm text-slate-100 mt-1 line-clamp-2">{topic.title}</h4>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }) {
  return (
    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
      <div>
        <p className="text-xs text-slate-400 mb-1">{title}</p>
        <p className="text-2xl font-black text-white">{value}</p>
      </div>
      <div className="p-3 rounded-xl bg-slate-800">{icon}</div>
    </div>
  );
}

function TopicDetailWorkspace({ topic, topics, materials, formulas, activeSubTab, onChangeSubTab, onSelectTopic, onOpenAddMaterial, onDeleteMaterial, onToggleFavorite }) {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex justify-between items-center">
        <select value={topic.id} onChange={(e) => onSelectTopic(e.target.value)} className="bg-slate-800 text-slate-100 font-semibold text-sm rounded-lg px-3 py-1.5 border border-slate-700">
          {topics.map((t, idx) => <option key={t.id} value={t.id}>{idx + 1}. {t.title}</option>)}
        </select>
        <button onClick={onOpenAddMaterial} className="px-3.5 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Додати матеріал
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {materials.map(mat => (
          <div key={mat.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <h4 className="font-semibold text-sm text-slate-100 mb-1">{mat.title}</h4>
            <p className="text-xs text-slate-400 line-clamp-2 mb-2">{mat.description}</p>
            <a href={mat.url} target="_blank" rel="noreferrer" className="text-xs text-blue-400 flex items-center gap-1">
              Відкрити ресурс <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

function FormulaBankView({ formulas, onAddFormula }) {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Calculator className="w-6 h-6 text-blue-400" /> Довідник фізичних формул</h2>
        <button onClick={onAddFormula} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold"><Plus className="w-4 h-4 inline" /> Додати формулу</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {formulas.map(f => (
          <div key={f.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <h4 className="font-bold text-sm text-white">{f.title}</h4>
            <div className="p-4 rounded-xl bg-slate-950 font-mono text-lg text-blue-400 font-bold text-center">{f.latex}</div>
            <p className="text-xs text-slate-300">{f.explanation}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsView({ onExport, topicsCount, materialsCount }) {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-white">Налаштування та Резервне копіювання</h2>
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <button onClick={onExport} className="px-5 py-3 bg-blue-600 text-white font-semibold rounded-xl text-xs flex items-center gap-2">
          <Download className="w-4 h-4" /> Експортувати копію (JSON)
        </button>
        <p className="text-xs text-slate-400">• Усього тем: {topicsCount} | Матеріалів: {materialsCount}</p>
      </div>
    </div>
  );
}

function PresentationView({ activeTopic, materials, theory, formulas, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col justify-between p-6">
      <div className="flex justify-between border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs text-blue-400 uppercase font-bold">Демонстрація</span>
          <h2 className="text-lg font-bold">{activeTopic.title}</h2>
        </div>
        <button onClick={onClose} className="px-4 py-2 bg-slate-800 text-xs font-bold rounded-xl"><X className="w-4 h-4 inline" /> Вийти</button>
      </div>
      <div className="flex-1 flex items-center justify-center p-8 max-w-4xl mx-auto text-center">
        <h1 className="text-4xl font-black text-blue-400">{activeTopic.title}</h1>
      </div>
    </div>
  );
}