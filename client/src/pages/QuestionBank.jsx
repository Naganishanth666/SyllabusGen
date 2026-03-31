import React, { useState, useEffect, createContext, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import { ArrowLeft, Loader, Plus, FileQuestion, Maximize2, Minimize2, CheckCircle2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

const QuestionBankContext = createContext(null);

const extractText = (n) => {
    if (n.type === 'text') return n.value;
    if (n.children) return n.children.map(extractText).join('');
    return '';
};

const basePill = "text-white px-2.5 py-1 rounded-lg text-[13px] font-bold shadow-sm inline-flex items-center gap-1.5 mr-3 shrink-0";

const MarkdownListItem = ({ node, children, ...props }) => {
    const context = useContext(QuestionBankContext);
    if (!context) return <li {...props}>{children}</li>;
    
    const { bank, selectedAnswers, setSelectedAnswers } = context;
    const textContent = extractText(node).trim();

    let label = '';
    let pillClass = '';
    let pillIcon = null;
    let cleanText = textContent;

    const shortMatch = textContent.match(/^[\s\-*•]*(?:\*\*)?short answer(?::\*\*|:|\*\*)?\s*/i);
    const longMatch = textContent.match(/^[\s\-*•]*(?:\*\*)?long answer(?::\*\*|:|\*\*)?\s*/i);
    const appMatch = textContent.match(/^[\s\-*•]*(?:\*\*)?application(?:-based)?(?::\*\*|:|\*\*)?\s*/i);
    const quizMatch = textContent.match(/^[\s\-*•]*(?:\*\*)?quiz(?:\s*\(mcq\))?(?::\*\*|:|\*\*)?\s*/i);
    const bloomMatch = textContent.match(/^[\s\-*•]*(?:\*\*)?bloom'?s taxonomy(?::\*\*|:|\*\*)?\s*/i);

    if (shortMatch) {
        label = 'Short Answer';
        pillClass = `bg-blue-400 ${basePill}`;
        pillIcon = <span className="w-3 h-3 rounded-full bg-white/30" />;
        cleanText = textContent.substring(shortMatch[0].length);
    } else if (longMatch) {
        label = 'Long Answer';
        pillClass = `bg-purple-500 ${basePill}`;
        pillIcon = <span className="w-3 h-1 rounded bg-white/30" />;
        cleanText = textContent.substring(longMatch[0].length);
    } else if (appMatch) {
        label = 'Application-Based';
        pillClass = `bg-[#ff7b72] ${basePill}`;
        pillIcon = <span className="w-2 h-2 rounded-sm rotate-45 bg-white/30" />;
        cleanText = textContent.substring(appMatch[0].length);
    } else if (quizMatch) {
        label = 'Quiz (MCQ)';
        pillClass = `bg-emerald-500 ${basePill}`;
        pillIcon = <CheckCircle2 className="w-3.5 h-3.5 text-white/70" />;
        cleanText = textContent.substring(quizMatch[0].length);
    } else if (bloomMatch) {
        label = "Bloom's Taxonomy";
        pillClass = `bg-amber-500 ${basePill}`;
        pillIcon = <span className="w-2.5 h-2.5 rounded-sm bg-white/30" />;
        cleanText = textContent.substring(bloomMatch[0].length);
    }

    // Detect MCQ options inline: (A) ... (B) ... (C) ... (D) ...
    let questionText = cleanText;
    let options = [];

    const matchA = cleanText.match(/(?:\(\s*[Aa]\s*\)|\b[Aa]\))\s/);
    if (matchA && (label === 'Quiz (MCQ)' || textContent.toLowerCase().includes('mcq'))) {
        questionText = cleanText.substring(0, matchA.index).trim();
        const optionsString = cleanText.substring(matchA.index);
        const splits = optionsString.split(/(?:\(\s*[A-Ea-e]\s*\)|\b[A-Ea-e]\))\s/);
        options = splits.filter(o => o.trim().length > 0).map(o => o.trim());
    }

    // Plain bullet point — no pill, no options
    if (!label && options.length === 0) {
        return (
            <li className="pl-1 leading-relaxed mb-3 text-slate-700 marker:text-slate-400" {...props}>
                {children}
            </li>
        );
    }

    // Rich formatted item
    return (
        <li className="mb-6 block relative list-none -ml-4 pl-0 border-b border-slate-50 pb-6 last:border-0">
            <div className="flex items-start">
                <span className="text-slate-300 mr-3 mt-0.5 text-lg font-bold shrink-0">•</span>
                <div className="flex-1">
                    <div className="flex flex-wrap items-start gap-2">
                        {label && (
                            <span className={pillClass}>
                                {pillIcon}
                                {label}
                            </span>
                        )}
                        <span className="text-slate-700 font-medium text-[15px] leading-relaxed">
                            {questionText}
                        </span>
                    </div>

                    {options.length >= 2 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                            {options.map((opt, i) => {
                                const letter = String.fromCharCode(65 + i);
                                const isCorrect = opt.toLowerCase().includes('(correct');
                                const cleanOpt = opt.replace(/\(correct[^)]*\)/gi, '').trim();

                                const qId = `${bank.id}-${questionText.substring(0, 24).replace(/\s/g, '')}`;
                                const isSelected = selectedAnswers[qId] === i;
                                const showCorrect = isSelected && isCorrect;
                                const showIncorrect = isSelected && !isCorrect;

                                let cls = 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-white';
                                if (showCorrect) cls = 'bg-emerald-50 border-emerald-400 text-emerald-900 ring-1 ring-emerald-300';
                                if (showIncorrect) cls = 'bg-red-50 border-red-400 text-red-900 ring-1 ring-red-300';

                                return (
                                    <button
                                        key={i}
                                        onClick={() => setSelectedAnswers(prev => ({ ...prev, [qId]: i }))}
                                        className={`p-3 rounded-xl border flex items-start text-left gap-3 text-[14px] transition-all w-full ${cls}`}
                                    >
                                        <span className={`font-bold mt-0.5 shrink-0 ${showCorrect ? 'text-emerald-600' : showIncorrect ? 'text-red-500' : 'text-slate-400'}`}>
                                            ({letter})
                                        </span>
                                        <span className="flex-1">{cleanOpt}</span>
                                        {showCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </li>
    );
};

const staticMarkdownComponents = {
    h3: ({ node, ...props }) => (
        <h3 className="flex items-center gap-2 mt-8 mb-4 pb-2 border-b-2 border-slate-100 text-teal-700 font-bold text-lg" {...props} />
    ),
    li: MarkdownListItem,
    p: ({ node, children, ...props }) => (
        <span className="text-slate-700 text-[15px] leading-relaxed" {...props}>{children}</span>
    ),
    strong: ({ node, ...props }) => <strong className="font-bold text-slate-800" {...props} />,
    ul: ({ node, ...props }) => <ul className="pl-5 mb-4 text-slate-700" {...props} />,
};

// ─── Main component ──────────────────────────────────────────────────────────
const QuestionBank = () => {
    const { id } = useParams();
    const [questionBanks, setQuestionBanks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [expandedBankId, setExpandedBankId] = useState(null);
    const [selectedAnswers, setSelectedAnswers] = useState({});
    const [difficulty, setDifficulty] = useState('Medium');
    const [numQuestions, setNumQuestions] = useState(5);

    useEffect(() => { fetchQuestionBanks(); }, [id]);

    const fetchQuestionBanks = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/syllabus/${id}/question-banks`);
            setQuestionBanks(res.data);
        } catch (err) {
            console.error('Error fetching question banks:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const res = await api.post('/generate/question-bank', { syllabusId: id, difficulty, numQuestions });
            setQuestionBanks(prev => [res.data, ...prev]);
        } catch (err) {
            console.error('Error generating question bank:', err);
            alert('Failed to generate question bank.');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            {/* ── Back link + title ── */}
            <div className="flex items-center mb-6">
                <Link to={`/syllabus/${id}`} className="mr-4 text-gray-500 hover:text-gray-700">
                    <ArrowLeft className="h-6 w-6" />
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">Question Bank Generator</h1>
            </div>

            {/* ── Generator card ── */}
            <div className="bg-gradient-to-r from-[#ff9a8b] via-[#ff6a88] to-[#9a76ff] p-1 rounded-2xl shadow-xl mb-12">
                <div className="bg-white/90 backdrop-blur-md rounded-xl p-6 sm:p-8">
                    <h2 className="text-2xl font-bold text-slate-800 mb-6">Generate New Questions ✨</h2>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                        {/* Difficulty */}
                        <div className="md:col-span-4">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Difficulty</label>
                            <div className="relative">
                                <select
                                    value={difficulty}
                                    onChange={e => setDifficulty(e.target.value)}
                                    className="appearance-none block w-full pl-11 pr-10 py-3.5 text-base border-0 ring-1 ring-slate-200 focus:ring-2 focus:ring-purple-500 rounded-xl bg-white shadow-sm font-semibold text-slate-700 transition-all cursor-pointer"
                                >
                                    <option value="Easy">Easy</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Hard">Hard</option>
                                </select>
                                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                    <span className={`w-3 h-3 rounded-full shadow-sm
                                        ${difficulty === 'Easy' ? 'bg-emerald-400' : ''}
                                        ${difficulty === 'Medium' ? 'bg-[#ff7b72]' : ''}
                                        ${difficulty === 'Hard' ? 'bg-rose-500' : ''}
                                    `} />
                                </div>
                            </div>
                        </div>

                        {/* Questions per module */}
                        <div className="md:col-span-4">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Questions per Module</label>
                            <input
                                type="number" min="1" max="15"
                                value={numQuestions}
                                onChange={e => setNumQuestions(e.target.value)}
                                className="block w-full border-0 ring-1 ring-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-purple-500 py-3.5 px-4 font-semibold text-slate-700 transition-all"
                            />
                        </div>

                        {/* Generate button */}
                        <div className="md:col-span-4">
                            <button
                                onClick={handleGenerate}
                                disabled={generating}
                                className="w-full inline-flex justify-center items-center py-3.5 px-6 border-0 shadow-lg shadow-purple-500/30 text-base font-bold rounded-xl text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 disabled:opacity-70 transition-all hover:-translate-y-0.5"
                            >
                                {generating ? <Loader className="animate-spin mr-2 h-5 w-5" /> : <Plus className="mr-2 h-5 w-5" />}
                                Generate
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Question Banks list ── */}
            <h2 className="text-xl font-bold text-slate-800 mb-6">Generated Question Banks</h2>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-16">
                    <Loader className="w-10 h-10 text-purple-600 animate-spin mb-4" />
                    <p className="font-semibold text-slate-500">Loading Question Banks...</p>
                </div>
            ) : questionBanks.length === 0 ? (
                <div className="text-center py-16 bg-white/50 rounded-3xl border border-slate-200 shadow-sm text-slate-500 font-semibold flex flex-col items-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                        <FileQuestion className="w-8 h-8 text-slate-400" />
                    </div>
                    No question banks generated yet. Start by generating one above!
                </div>
            ) : (
                <div className="space-y-6">
                    {questionBanks.map(bank => (
                        <div key={bank.id} className="bg-white/90 shadow-lg border border-slate-200/60 rounded-3xl overflow-hidden transition-all duration-300">

                            {/* Header */}
                            <div
                                className="px-6 py-4 bg-gradient-to-r from-rose-50 to-purple-50 flex justify-between items-center cursor-pointer border-b border-slate-100/50 hover:bg-white transition-colors"
                                onClick={() => setExpandedBankId(expandedBankId === bank.id ? null : bank.id)}
                            >
                                <div className="flex items-center gap-3">
                                    <span className={`px-3 py-1 rounded-lg text-xs font-bold text-white shadow-sm
                                        ${bank.difficulty === 'Easy' ? 'bg-emerald-400' : ''}
                                        ${bank.difficulty === 'Medium' ? 'bg-[#ff7b72]' : ''}
                                        ${bank.difficulty === 'Hard' ? 'bg-rose-500' : ''}
                                    `}>{bank.difficulty}</span>
                                    <h3 className="text-sm font-bold text-slate-800">
                                        Question Bank <span className="text-slate-400 font-normal">— {new Date(bank.created_at).toLocaleString()}</span>
                                    </h3>
                                </div>
                                <button className="text-slate-400 hover:text-slate-600 flex items-center gap-2 text-sm font-semibold">
                                    {expandedBankId === bank.id ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                                    {expandedBankId === bank.id ? 'Collapse' : 'Expand'}
                                </button>
                            </div>

                            {/* Body */}
                            {expandedBankId === bank.id && (
                                <div className="px-6 py-8 sm:px-8 bg-white max-h-[800px] overflow-y-auto">
                                    <article className="prose prose-slate max-w-none prose-headings:text-slate-800 text-slate-700">
                                        <QuestionBankContext.Provider value={{ bank, selectedAnswers, setSelectedAnswers }}>
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm, remarkBreaks]}
                                                components={staticMarkdownComponents}
                                            >
                                                {bank.questions || 'No questions content available...'}
                                            </ReactMarkdown>
                                        </QuestionBankContext.Provider>
                                    </article>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default QuestionBank;
