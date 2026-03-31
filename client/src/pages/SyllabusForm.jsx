import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Loader, Save, Plus, Trash2, BookOpen, Clock, Settings, Building2 } from 'lucide-react';

const SyllabusForm = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        courseCode: '',
        department: '',
        duration: '',
        description: '',
        objectives: '',
        modulesCount: 5,
        includeCaseStudies: false,
        benchmarkingUniversities: '',
        customModules: []
    });

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const addModule = () => {
        setFormData({
            ...formData,
            customModules: [...formData.customModules, { title: '', duration: '', description: '' }]
        });
    };

    const removeModule = (index) => {
        const newModules = formData.customModules.filter((_, i) => i !== index);
        setFormData({ ...formData, customModules: newModules });
    };

    const handleModuleChange = (index, field, value) => {
        const newModules = [...formData.customModules];
        newModules[index][field] = value;
        setFormData({ ...formData, customModules: newModules });
    };

    const formatSyllabusText = (text) => {
        // Convert plain text to styled markdown without changing content
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await api.post('/generate/syllabus', formData);

            // Format the raw text with markdown styling before passing it to the view
            const prettyText = formatSyllabusText(response.data.generatedText);

            // Navigate to view/edit page with generated data and form data
            // We'll pass state to the route
            navigate('/syllabus/new', {
                state: {
                    generatedText: prettyText,
                    metaData: formData
                }
            });
        } catch (err) {
            console.error('Error generating syllabus:', err);
            alert('Failed to generate syllabus. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 py-12">
            <div className="max-w-4xl w-full bg-white/70 backdrop-blur-xl p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/20">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-indigo-600/10 rounded-2xl">
                        <BookOpen className="w-8 h-8 text-indigo-600" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">Create New Syllabus</h1>
                        <p className="text-slate-500 font-medium">Generate a comprehensive AI-powered course syllabus.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Basic Info Section */}
                    <div className="bg-white/50 p-6 rounded-2xl border border-white/50 shadow-sm space-y-6">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Settings className="w-5 h-5 text-indigo-500" />
                            Course Details
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Course Title</label>
                                <input name="title" required className="block w-full rounded-xl border-slate-200 bg-white/50 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all p-3" onChange={handleChange} placeholder="e.g. Advanced Machine Learning" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Course Code</label>
                                <input name="courseCode" required className="block w-full rounded-xl border-slate-200 bg-white/50 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all p-3" onChange={handleChange} placeholder="e.g. CS601" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Department</label>
                                <input name="department" required className="block w-full rounded-xl border-slate-200 bg-white/50 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all p-3" onChange={handleChange} placeholder="e.g. Computer Science" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1"><Clock className="w-4 h-4" /> Total Duration (Hours)</label>
                                <input name="duration" type="number" required className="block w-full rounded-xl border-slate-200 bg-white/50 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all p-3" onChange={handleChange} placeholder="e.g. 45" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Course Description</label>
                            <textarea name="description" rows="3" required className="block w-full rounded-xl border-slate-200 bg-white/50 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all p-3 resize-none" onChange={handleChange} placeholder="Provide a brief overview of the course..."></textarea>
                        </div>
                    </div>

                    {/* Module Builder */}
                    <div className="bg-white/50 p-6 rounded-2xl border border-white/50 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-indigo-500" />
                                    Module Builder <span className="text-xs font-normal bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">Optional</span>
                                </h2>
                                <p className="text-sm text-slate-500 mt-1">Pre-define specific modules. The AI will seamlessly integrate and expand upon them.</p>
                            </div>
                            <button type="button" onClick={addModule} className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-600 font-semibold rounded-xl hover:bg-indigo-100 transition-colors border border-indigo-100">
                                <Plus className="w-4 h-4" /> Add Module
                            </button>
                        </div>

                        <div className="space-y-4">
                            {formData.customModules.map((module, index) => (
                                <div key={index} className="group relative bg-white/60 p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-all">
                                    <button type="button" onClick={() => removeModule(index)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <h3 className="text-sm font-bold text-indigo-600 mb-4 tracking-wide uppercase">Module {index + 1}</h3>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
                                            <input
                                                type="text"
                                                value={module.title}
                                                onChange={(e) => handleModuleChange(index, 'title', e.target.value)}
                                                className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all p-2.5 text-sm"
                                                placeholder="e.g. Introduction to Neural Networks"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">Duration (Hours)</label>
                                            <input
                                                type="number"
                                                value={module.duration}
                                                onChange={(e) => handleModuleChange(index, 'duration', e.target.value)}
                                                className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all p-2.5 text-sm"
                                                placeholder="e.g. 5"
                                            />
                                        </div>
                                        <div className="md:col-span-3">
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">Topics / Description</label>
                                            <textarea
                                                value={module.description}
                                                onChange={(e) => handleModuleChange(index, 'description', e.target.value)}
                                                rows="2"
                                                className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all p-2.5 text-sm resize-none"
                                                placeholder="List key topics or directions for the AI..."
                                            ></textarea>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {formData.customModules.length === 0 && (
                                <div className="text-center py-8 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
                                    <p className="text-sm text-slate-500 mb-3">No custom modules added. The AI will generate all modules automatically.</p>
                                    <button type="button" onClick={addModule} className="sm:hidden inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-600 font-semibold rounded-xl hover:bg-indigo-100 transition-colors border border-indigo-100">
                                        <Plus className="w-4 h-4" /> Add Module
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Additional Settings */}
                    <div className="bg-white/50 p-6 rounded-2xl border border-white/50 shadow-sm space-y-6">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-indigo-500" />
                            Advanced Settings
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Target Number of Modules</label>
                                <input name="modulesCount" type="number" min="1" max="10" value={formData.modulesCount} className="block w-full rounded-xl border-slate-200 bg-white/50 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all p-3" onChange={handleChange} />
                            </div>
                            <div className="flex items-center h-[52px] bg-white/50 px-4 rounded-xl border border-slate-200">
                                <input id="includeCaseStudies" name="includeCaseStudies" type="checkbox" className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer transition-all" onChange={handleChange} />
                                <label htmlFor="includeCaseStudies" className="ml-3 block text-sm font-medium text-slate-700 cursor-pointer">Include Real-World Case Studies</label>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Benchmarking Universities</label>
                            <input name="benchmarkingUniversities" className="block w-full rounded-xl border-slate-200 bg-white/50 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all p-3" placeholder="e.g. MIT, Stanford (Comma separated)" onChange={handleChange} />
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-200/60">
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative overflow-hidden inline-flex items-center px-8 py-3.5 border border-transparent text-base font-bold rounded-2xl text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 shadow-lg shadow-indigo-500/30 transition-all hover:shadow-indigo-500/50 hover:-translate-y-0.5"
                        >
                            {loading ? (
                                <>
                                    <Loader className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                                    Generating Magic...
                                </>
                            ) : (
                                <>
                                    Generate Syllabus
                                    <svg className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SyllabusForm;
