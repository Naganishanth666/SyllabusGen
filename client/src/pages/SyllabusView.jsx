import React, { useState, useEffect } from 'react';
import { useLocation, useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { Save, RefreshCw, Download, FileQuestion, ArrowLeft, Loader, Eye, Code, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

const SyllabusView = () => {
    const { id } = useParams(); // 'new' or actual ID
    const location = useLocation();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [regenerating, setRegenerating] = useState(false);
    const [syllabus, setSyllabus] = useState(null); // The full object
    const [content, setContent] = useState(''); // The editable text content
    const [viewMode, setViewMode] = useState('preview'); // 'preview' or 'edit'
    const [metaData, setMetaData] = useState(null); // For new syllabi

    useEffect(() => {
        if (id === 'new') {
            if (location.state) {
                setContent(location.state.generatedText);
                setMetaData(location.state.metaData);
                setViewMode('preview');
            } else {
                navigate('/create-syllabus');
            }
        } else {
            fetchSyllabus(id);
        }
    }, [id, location.state, navigate]);

    const formatSyllabusText = (text) => {
        if (!text) return '';
        let formatted = text;

        // 1. Convert Top-level Key: Value to H2 and Bold
        formatted = formatted.replace(/^(Course Title|Course Code|Department|Total Duration|Course Description|Course Objectives|Course Outcomes|CO-PEO Mapping Matrix|Textbooks|Reference Books|Syllabus Benchmarking)(:)\s*(.*)$/gm, '\n## $1$2 **$3**\n');

        // 2. Convert raw numbered lists (like in Objectives) to proper markdown lists
        formatted = formatted.replace(/^(\d+\.)\s+(.*)$/gm, '$1 $2');

        // 3. Convert Module headers into H3 distinct sections with a separator line
        // Some models output '### Module 1' some output 'Module 1:'
        formatted = formatted.replace(/^(#*\s*Module\s+\d+[:\s]+)(.*)$/gmi, '\n---\n\n### **$1** *$2*\n');

        // 4. Convert internal module fields to bold bullet points
        formatted = formatted.replace(/^[-*]?\s*(Duration|Overview|Title|Topics)\s*(:.*)$/gmi, '- **$1**$2');

        // 5. Clean up excessive newlines
        formatted = formatted.replace(/\n{3,}/g, '\n\n');

        return formatted;
    };

    const fetchSyllabus = async (syllabusId) => {
        setLoading(true);
        try {
            const response = await api.get(`/syllabus/${syllabusId}`);
            setSyllabus(response.data);
            // Determine content format
            let textContent = response.data.syllabus_json;
            if (typeof textContent === 'object' && textContent.content) {
                textContent = textContent.content;
            } else if (typeof textContent === 'object') {
                textContent = JSON.stringify(textContent, null, 2);
            }

            // Format the raw content for better markdown rendering
            setContent(formatSyllabusText(textContent));
            setMetaData({
                title: response.data.course_title,
                courseCode: response.data.course_code,
                department: response.data.department,
                duration: response.data.duration,
                description: response.data.description,
                objectives: response.data.objectives
            });
        } catch (err) {
            console.error('Error fetching syllabus:', err);
        } finally {
            setLoading(false);
        }
    };

    const saveSyllabusData = async () => {
        const payload = { ...metaData, syllabusContent: content };
        if (id === 'new') {
            const response = await api.post('/syllabus', payload);
            navigate(`/syllabus/${response.data.id}`);
            return response.data;
        } else {
            const response = await api.put(`/syllabus/${id}`, payload);
            setSyllabus(response.data);
            return response.data;
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await saveSyllabusData();
            if (id !== 'new') alert('Saved successfully!');
        } catch (err) {
            console.error('Error saving syllabus:', err);
            alert('Failed to save.');
        } finally {
            setLoading(false);
        }
    };

    const handleRegenerate = async () => {
        setRegenerating(true);
        try {
            // Auto-save user edits before regenerating
            await saveSyllabusData();

            const response = await api.post('/regenerate/syllabus', {
                currentSyllabus: content,
                instructions: 'Seamlessly rewrite the syllabus incorporating any notes or edits inside the modules themselves. Make it highly detailed.'
            });
            setContent(response.data.generatedText);
        } catch (err) {
            console.error('Error regenerating:', err);
            alert('Failed to regenerate.');
        } finally {
            setRegenerating(false);
        }
    };

    const handlePdfDownload = () => {
        if (id === 'new') return alert("Please save the syllabus first.");
        window.open(`http://localhost:5000/api/syllabus/${id}/pdf?token=${localStorage.getItem('token')}`, '_blank');
        // Note: Passing token in query param is not ideal for security but simple for plain window.open. 
        // Better approach: fetch blob with axios headers and create object URL.
        // But let's stick to this or assume the browser handles the download if authenticated via cookie (which we aren't using).
        // Actually, since we use header auth, we MUST use axios.
        downloadPdfSecurely();
    };

    const downloadPdfSecurely = async () => {
        try {
            const response = await api.get(`/syllabus/${id}/pdf`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `syllabus-${metaData?.courseCode || 'download'}.pdf`);
            document.body.appendChild(link);
            link.click();
        } catch (err) {
            console.error("PDF download failed", err);
            alert("Failed to download PDF");
        }
    };

    // Add the parseContentFields function before the return block
    const parseContentFields = (text) => {
        const sections = {
            objectives: '',
            outcomes: '',
            matrix: '',
            modulesText: '',
            footer: '',
        };

        const lines = text.split('\n');
        let currentSection = 'intro';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (/^(##\s*)?course objectives/i.test(line)) {
                currentSection = 'objectives';
            } else if (/^(##\s*)?course outcomes/i.test(line)) {
                currentSection = 'outcomes';
            } else if (/^(##\s*)?co-peo mapping matrix/i.test(line)) {
                currentSection = 'matrix';
            } else if (/^(##\s*)?module-wise syllabus/i.test(line) || /^#*\s*module\s+1/i.test(line)) {
                currentSection = 'modulesText';
            } else if (/^(##\s*)?textbooks/i.test(line) || /^(##\s*)?reference books/i.test(line)) {
                currentSection = 'footer';
            }

            if (currentSection !== 'intro') {
                sections[currentSection] += line + '\n';
            }
        }
        return sections;
    };

    const renderStructuredPreview = () => {
        const sections = parseContentFields(content);

        // Fallback if parsing didn't find specific sections
        if (!sections.objectives && !sections.outcomes && !sections.modulesText) {
            return (
                <div className="p-8 sm:p-12 max-w-4xl mx-auto">
                    <article className="prose prose-slate prose-headings:text-teal-800 prose-h2:text-teal-700 prose-h3:text-emerald-700 prose-a:text-teal-600 hover:prose-a:text-teal-500 prose-strong:text-teal-900 prose-table:rounded-xl prose-table:overflow-hidden prose-table:border prose-table:border-teal-100 prose-th:bg-teal-50 prose-th:text-teal-800 prose-td:border-b prose-td:border-teal-50 max-w-none prose-p:leading-relaxed prose-li:marker:text-teal-500">
                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{content}</ReactMarkdown>
                    </article>
                </div>
            );
        }

        const mdComponents = {
            h2: ({ node, ...props }) => <h2 className="text-xl font-bold text-teal-800 mb-4 mt-6 first:mt-0 tracking-tight" {...props} />,
            h3: ({ node, ...props }) => <h3 className="text-lg font-bold text-teal-700 mt-6 mb-3" {...props} />,
            p: ({ node, ...props }) => <p className="mb-3 text-slate-700 leading-relaxed font-medium text-[15px]" {...props} />,
            ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-4 space-y-1 text-slate-700 font-medium text-[15px] marker:text-teal-500" {...props} />,
            ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-4 space-y-1 text-slate-700 font-medium text-[15px] marker:text-teal-500" {...props} />,
            li: ({ node, ...props }) => <li className="pl-1" {...props} />,
            table: ({ node, ...props }) => (
                <div className="overflow-x-auto mb-6 rounded-2xl border border-teal-100 bg-white shadow-sm">
                    <table className="w-full text-left text-[15px]" {...props} />
                </div>
            ),
            thead: ({ node, ...props }) => <thead className="bg-[#e8f5f3] text-teal-900 border-b border-teal-100" {...props} />,
            th: ({ node, ...props }) => <th className="px-4 py-3.5 font-bold" {...props} />,
            td: ({ node, ...props }) => <td className="px-4 py-3 border-b border-teal-50 text-slate-700 font-medium" {...props} />,
        };

        const moduleComponents = {
            ...mdComponents,
            h2: ({ node, ...props }) => <h2 className="text-2xl font-extrabold text-teal-800 mb-6 tracking-tight" {...props} />,
            h3: ({ node, ...props }) => (
                <div className="flex items-center gap-3 mt-10 mb-5">
                    <div className="w-2 h-8 bg-teal-500 rounded-full"></div>
                    <h3 className="text-xl font-bold text-slate-800 m-0" {...props} />
                </div>
            ),
            strong: ({ node, ...props }) => {
                const text = String(props.children);
                const basePill = "text-white px-3.5 py-1 rounded-lg text-sm font-bold shadow-sm inline-block mb-2 mr-2";
                if (text.includes('Title')) return <span className={`bg-blue-500 ${basePill}`}>{props.children}</span>;
                if (text.includes('Topics')) return <span className={`bg-emerald-500 ${basePill} mt-3`}>{props.children}</span>;
                if (text.includes('Duration')) return <span className={`bg-purple-500 ${basePill}`}>{props.children}</span>;
                if (text.includes('Overview')) return <span className={`bg-amber-500 ${basePill}`}>{props.children}</span>;
                return <strong className="font-bold text-slate-800" {...props} />;
            },
            ul: ({ node, ...props }) => (
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-6">
                    <ul className="list-disc pl-5 space-y-2 text-slate-700 font-medium text-[15px] marker:text-emerald-500" {...props} />
                </div>
            )
        };

        return (
            <div className="p-6 sm:p-10 max-w-7xl mx-auto w-full">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* Left Column (Objectives & Outcomes) */}
                    <div className="lg:col-span-5 space-y-8">
                        {sections.objectives && (
                            <div>
                                <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={mdComponents}>
                                    {sections.objectives}
                                </ReactMarkdown>
                            </div>
                        )}
                        {sections.outcomes && (
                            <div>
                                <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={mdComponents}>
                                    {sections.outcomes}
                                </ReactMarkdown>
                            </div>
                        )}
                    </div>

                    {/* Right Column (Mapping Matrix) */}
                    <div className="lg:col-span-7">
                        {sections.matrix && (
                            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={mdComponents}>
                                {sections.matrix}
                            </ReactMarkdown>
                        )}
                    </div>
                </div>

                {/* Modules Wrapper */}
                {sections.modulesText && (
                    <div className="mt-12 pt-8">
                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={moduleComponents}>
                            {sections.modulesText}
                        </ReactMarkdown>
                    </div>
                )}

                {/* Footer Data (Textbooks, etc) */}
                {sections.footer && (
                    <div className="mt-12 p-8 bg-[#f8fafc] border border-slate-200 rounded-3xl">
                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={mdComponents}>
                            {sections.footer}
                        </ReactMarkdown>
                    </div>
                )}
            </div>
        );
    };

    // ... down in the return block
    if (loading && !syllabus && id !== 'new') return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
            <div className="flex flex-col items-center gap-4 text-indigo-600">
                <Loader className="w-12 h-12 animate-spin" />
                <p className="font-semibold text-lg">Loading Syllabus...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-[calc(100vh-4rem)] p-4 py-8">
            <div className="max-w-[1400px] mx-auto space-y-6">

                {/* Header Card */}
                <div className="bg-white/90 backdrop-blur-xl shadow-lg border border-white/40 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-4">
                        <Link to="/dashboard" className="p-3 bg-white hover:bg-slate-50 text-slate-600 rounded-2xl transition-colors shadow-sm border border-slate-200">
                            <ArrowLeft className="w-5 h-5 text-slate-500" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="px-3 py-1 bg-slate-100 text-slate-700 font-bold text-xs tracking-wider rounded-lg uppercase border border-slate-200">{metaData?.courseCode || 'NEW'}</span>
                                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{metaData?.title || 'New Syllabus'}</h1>
                            </div>
                            <p className="text-slate-600 text-sm font-semibold">{metaData?.department} • {metaData?.duration} Hours</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        {id !== 'new' && (
                            <>
                                <Link to={`/syllabus/${id}/notes`} className="flex-1 md:flex-none inline-flex justify-center items-center px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-all shadow-sm">
                                    <FileText className="mr-2 w-4 h-4 text-emerald-500" />
                                    Notes
                                </Link>
                                <Link to={`/syllabus/${id}/questions`} className="flex-1 md:flex-none inline-flex justify-center items-center px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-all shadow-sm">
                                    <FileQuestion className="mr-2 w-4 h-4 text-emerald-500" />
                                    Questions
                                </Link>
                                <button onClick={downloadPdfSecurely} className="flex-1 md:flex-none inline-flex justify-center items-center px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-all shadow-sm">
                                    <Download className="mr-2 w-4 h-4 text-emerald-500" />
                                    PDF
                                </button>
                            </>
                        )}

                        <button
                            onClick={handleRegenerate}
                            disabled={regenerating}
                            className="flex-1 md:flex-none inline-flex justify-center items-center px-4 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-sm disabled:opacity-50"
                        >
                            {regenerating ? <Loader className="animate-spin mr-2 w-4 h-4" /> : <RefreshCw className="mr-2 w-4 h-4" />}
                            Regenerate
                        </button>

                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="flex-1 md:flex-none inline-flex justify-center items-center px-6 py-2.5 bg-indigo-600 border border-transparent text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-md disabled:opacity-70"
                        >
                            {loading ? <Loader className="animate-spin mr-2 w-4 h-4" /> : <Save className="mr-2 w-4 h-4" />}
                            Save
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="bg-white shadow-xl border border-slate-200 rounded-3xl overflow-hidden flex flex-col min-h-[800px]">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50/80">
                        <div className="flex items-center gap-2 p-1 bg-slate-200/50 rounded-xl">
                            <button
                                onClick={() => setViewMode('preview')}
                                className={`flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-sm transition-all ${viewMode === 'preview' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/80'}`}
                            >
                                <Eye className="w-4 h-4" /> Interactive View
                            </button>
                            <button
                                onClick={() => setViewMode('edit')}
                                className={`flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-sm transition-all ${viewMode === 'edit' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/80'}`}
                            >
                                <Code className="w-4 h-4" /> Raw Text Source
                            </button>
                        </div>

                        <div className="hidden sm:flex items-center text-slate-500 text-xs font-bold px-4 uppercase tracking-wider">
                            <FileText className="w-4 h-4 mr-1.5" />
                            {content.length} characters
                        </div>
                    </div>

                    {/* Editor / Preview Area */}
                    <div className="flex-1 bg-[#fcfdfe]">
                        {viewMode === 'preview' ? (
                            renderStructuredPreview()
                        ) : (
                            <div className="flex-1 w-full h-full min-h-[600px] flex flex-col">
                                <textarea
                                    className="flex-1 w-full p-8 bg-transparent font-mono text-sm leading-relaxed text-slate-700 focus:outline-none resize-none"
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Markdown syllabus content..."
                                    spellCheck="false"
                                ></textarea>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SyllabusView;
