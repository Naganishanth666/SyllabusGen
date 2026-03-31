import process from 'process'; // for any legacy Node stuff
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import { ArrowLeft, Loader, FileText, Download, Sparkles, BookOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import mermaid from 'mermaid';

// Initialize Mermaid globally for the React context
mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose',
    fontFamily: 'Inter, sans-serif'
});

const MermaidBlock = ({ code }) => {
    const [svg, setSvg] = useState('');

    useEffect(() => {
        let isMounted = true;
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const errorId = `d${id}`; 

        const renderDiagram = async () => {
            try {
                // Ensure parse checks it before it attempts to paint to DOM, which strands error SVGs
                await mermaid.parse(code);
                const { svg } = await mermaid.render(id, code);
                if (isMounted) setSvg(svg);
            } catch (err) {
                console.error("Mermaid syntax error:", err);
                
                // Mermaid leaves an error SVG bomb on the body if it fails
                const strandedBombs = document.querySelectorAll('svg[id^="dmermaid-"]');
                strandedBombs.forEach(node => node.remove());

                if (isMounted) setSvg(`<div class="text-red-500 font-medium text-sm p-4 text-center border border-red-200 bg-red-50 rounded-lg">AI passed invalid diagram syntax. Please regenerate.</div>`);
            }
        };
        
        if (code) renderDiagram();
        return () => { isMounted = false; };
    }, [code]);

    if (!svg) return <div className="my-8 flex items-center justify-center bg-slate-50 border border-slate-100 p-6 rounded-3xl animate-pulse h-48 w-full"><Loader className="animate-spin text-slate-300" /></div>;

    return (
        <div 
            className="my-10 flex w-full justify-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm overflow-x-auto ring-1 ring-slate-900/5"
            dangerouslySetInnerHTML={{ __html: svg }} 
        />
    );
};

const MathJaxBlock = ({ code }) => {
    try {
        const html = katex.renderToString(code, { displayMode: true, throwOnError: false });
        return <div dangerouslySetInnerHTML={{ __html: html }} className="my-6 flex w-full justify-center overflow-x-auto text-lg text-slate-800" />;
    } catch (e) {
        return <pre className="text-red-500 overflow-x-auto p-4 bg-red-50 rounded-xl">{code}</pre>;
    }
};

const CourseNotes = () => {
    const { id } = useParams();
    const [notes, setNotes] = useState(null);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [syllabusText, setSyllabusText] = useState('');
    const [courseTitle, setCourseTitle] = useState('');
    const [progress, setProgress] = useState({ current: 0, total: 0, active: false });

    useEffect(() => { 
        fetchSyllabusAndNotes(); 
    }, [id]);

    const fetchSyllabusAndNotes = async () => {
        setLoading(true);
        try {
            const [syllabusRes, notesRes] = await Promise.all([
                api.get(`/syllabus/${id}`),
                api.get(`/syllabus/${id}/notes`)
            ]);
            let textContent = syllabusRes.data.syllabus_json;
            if (typeof textContent === 'object' && textContent !== null) {
                textContent = textContent.content || textContent.syllabusContent || JSON.stringify(textContent, null, 2);
            }
            textContent = textContent.replace(/\\n/g, '\n');
            setSyllabusText(textContent);
            setCourseTitle(syllabusRes.data.course_title || '');
            setNotes(notesRes.data.notes);
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    const parseModules = (text) => {
        const lines = text.split('\n');
        let modules = [];
        let currentModuleLines = [];
        let inModulesSection = false;

        for (const line of lines) {
            const trimmed = line.trim();
            
            // Broadened regex to cut through aggressive markdown wrappers like `### **### Module 1: **`
            if (/^[\s#\*\-_]*Module\s*1\b/i.test(trimmed)) {
                inModulesSection = true;
            }
            
            // Seal the module block extraction if we hit any standardized syllabus tail-sections
            if (inModulesSection && /^(?:[\s#\*\-_]*)(textbooks|reference books|case studies|syllabus benchmarking)/i.test(trimmed)) {
                inModulesSection = false;
            }

            if (inModulesSection) {
                if (/^[\s#\*\-_]*Module\s*\d+\b/i.test(trimmed)) {
                    if (currentModuleLines.length > 0) {
                        modules.push(currentModuleLines.join('\n'));
                    }
                    currentModuleLines = [line];
                } else {
                    currentModuleLines.push(line);
                }
            }
        }
        
        if (currentModuleLines.length > 0) {
            modules.push(currentModuleLines.join('\n'));
        }
        return modules;
    };

    const handleGenerate = async () => {
        const modules = parseModules(syllabusText);
        
        if (modules.length === 0) {
            return alert("Could not extract individual modules. Ensure your syllabus has standard 'Module X' headers.");
        }

        setGenerating(true);
        setProgress({ current: 1, total: modules.length, active: true });
        
        try {
            let fullNotes = `# Comprehensive Notes: ${courseTitle || 'Course'}\n\n`;
            setNotes(fullNotes); 

            for (let i = 0; i < modules.length; i++) {
                setProgress({ current: i + 1, total: modules.length, active: true });
                
                const moduleInput = modules[i];
                const res = await api.post('/generate/course-module-notes', {
                    syllabusId: id,
                    courseTitle: courseTitle,
                    moduleContent: moduleInput
                });
                
                const generatedChunk = res.data.notes;
                fullNotes += generatedChunk + '\n\n---\n\n';
                setNotes(fullNotes); 
                
                // CRITICAL: Groq generates so fast (800 tok/sec) that hammering 7 modules back-to-back immediately blows past their 12,000 TPM limit. 
                // Using the Leaky Bucket formula, 12,000 TPM = 200 Tokens/Sec regenerated. We use exactly 8,500 tokens per module burst.
                // An explicit 45-second breather ensures 9,000 tokens are regenerated back into the pool while the frontend idles! This permanently prevents compounded token starvation across 100-page generations.
                if (i < modules.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 45000));
                }
            }

            await api.put(`/syllabus/${id}/notes`, {
                syllabusId: id,
                compiledNotes: fullNotes
            });

        } catch (err) {
            console.error('Error generating module notes:', err);
            alert('Failed to complete course notes generation.');
        } finally {
            setGenerating(false);
            setProgress({ current: 0, total: 0, active: false });
        }
    };

    const handlePdfDownload = async () => {
        try {
            const response = await api.get(`/syllabus/${id}/notes/pdf`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `course-notes-${id}.pdf`);
            document.body.appendChild(link);
            link.click();
        } catch (err) {
            console.error("PDF download failed", err);
            alert("Failed to download PDF");
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-4 py-8">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                    <Link to={`/syllabus/${id}`} className="mr-4 text-gray-500 hover:text-gray-700 transition-colors">
                        <ArrowLeft className="h-6 w-6" />
                    </Link>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Course Notes</h1>
                </div>

                {!generating && notes && (
                    <button onClick={handlePdfDownload} className="inline-flex justify-center items-center px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-all shadow-sm">
                        <Download className="mr-2 w-4 h-4 text-emerald-500" />
                        Download PDF
                    </button>
                )}
            </div>

            <div className="bg-gradient-to-r from-blue-400 to-indigo-500 p-1 rounded-2xl shadow-xl mb-12">
                <div className="bg-white/95 backdrop-blur-md rounded-xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 mb-2">Comprehensive AI Notes</h2>
                        <p className="text-slate-600 text-sm font-medium">
                            Generate highly detailed academic course notes covering every topic in your syllabus module-by-module.
                        </p>
                        
                        {progress.active && (
                            <div className="mt-5 w-full bg-indigo-50/50 backdrop-blur-md border border-indigo-100/50 rounded-2xl p-5 shadow-inner">
                                <div className="flex items-center justify-between mb-3 text-sm font-bold text-indigo-800">
                                    <div className="flex items-center">
                                        <Loader className="animate-spin mr-3 h-5 w-5 text-indigo-600" />
                                        <span>Deep Dive Generation in Progress...</span>
                                    </div>
                                    <span className="bg-indigo-100 text-indigo-700 py-1 px-3 rounded-full font-black">
                                        Module {progress.current} / {progress.total}
                                    </span>
                                </div>
                                <div className="w-full bg-indigo-100/50 rounded-full h-3 mb-3 overflow-hidden border border-indigo-200/50">
                                    <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 h-3 rounded-full transition-all duration-700 ease-out" style={{ width: `${(progress.current / progress.total) * 100}%` }}></div>
                                </div>
                                <div className="flex flex-col gap-1 text-xs text-indigo-600/80 font-medium">
                                    <p className="flex items-center animate-pulse"><Sparkles className="w-3 h-3 mr-1.5" /> Compiling 8 massive academic micro-topics per module...</p>
                                    <p className="flex items-center"><FileText className="w-3 h-3 mr-1.5" /> Synthesizing high-DPI mathematical LaTeX & diagram algorithms...</p>
                                    <p className="flex items-center text-indigo-500"><Loader className="w-3 h-3 mr-1.5 animate-spin" /> Network traffic buffered to stay 100% Free Rate-Limit compliant</p>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <button
                        onClick={handleGenerate}
                        disabled={generating || !syllabusText}
                        className="w-full md:w-auto inline-flex justify-center items-center py-3.5 px-6 border-0 shadow-lg shadow-indigo-500/30 text-base font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 transition-all hover:-translate-y-0.5"
                    >
                        {generating ? <BookOpen className="animate-pulse mr-2 h-5 w-5" /> : <Sparkles className="mr-2 h-5 w-5" />}
                        {notes && !generating ? 'Regenerate Notes' : (generating ? 'Generating...' : 'Start Generation')}
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-16">
                    <Loader className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
                    <p className="font-semibold text-slate-500">Loading...</p>
                </div>
            ) : !notes ? (
                <div className="text-center py-20 bg-white/50 rounded-3xl border border-slate-200 shadow-sm text-slate-500 font-semibold flex flex-col items-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                        <FileText className="w-8 h-8 text-slate-400" />
                    </div>
                    No course notes generated yet. Click above to generate!
                </div>
            ) : (
                <div className="bg-white shadow-xl border border-slate-200 rounded-3xl overflow-hidden p-8 sm:p-12 mb-12">
                    <article className="prose prose-slate max-w-none prose-headings:text-indigo-900 prose-h2:text-indigo-800 prose-h3:text-indigo-700 text-slate-700 prose-li:marker:text-indigo-500">
                        <ReactMarkdown 
                            remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                            components={{
                                code({ node, inline, className, children, ...props }) {
                                    const match = /language-(\w+)/.exec(className || '');
                                    if (!inline && match && match[1] === 'mermaid') {
                                        return <MermaidBlock code={String(children).replace(/\n$/, '')} />;
                                    } else if (!inline && match && (match[1] === 'mathjax' || match[1] === 'math' || match[1] === 'latex')) {
                                        return <MathJaxBlock code={String(children).replace(/\n$/, '')} />;
                                    }
                                    return <code className={className} {...props}>{children}</code>;
                                }
                            }}
                        >
                            {notes}
                        </ReactMarkdown>
                    </article>
                </div>
            )}
        </div>
    );
};

export default CourseNotes;
