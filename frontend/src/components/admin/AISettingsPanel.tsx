import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
    Bot,
    CheckCircle2,
    Database,
    FlaskConical,
    KeyRound,
    Loader2,
    RotateCcw,
    Save,
    ShieldCheck,
    Zap,
} from 'lucide-react';
import { API_URL, authenticatedFetch, readJson } from '../../api/client';
import type { Translation } from '../../translations';
import type { AIProviderForm, AIProviderProfile, AISettingsState, ApiErrorBody } from '../../types';
import { cardStyle, inputStyle, primaryButtonStyle } from './styles';


interface AISettingsPanelProps {
    t: Translation;
    developerToken: string;
    onProviderActivated: () => void;
    onDeveloperModeExpired: () => void;
}

type ProviderPreset = 'gemini' | 'deepseek' | 'custom';
type PendingAction = 'load' | 'save' | 'test' | 'activate' | 'rollback' | null;

const emptyForm: AIProviderForm = {
    display_name: 'Render Gemini fallback',
    provider: 'gemini',
    base_url: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'gemini-3.1-flash-lite',
    api_key: '',
    temperature: 0.4,
    max_tokens: 1024,
    timeout_seconds: 45,
    thinking_mode: 'disabled',
};

function profileToForm(profile: AIProviderProfile): AIProviderForm {
    return {
        display_name: profile.display_name,
        provider: profile.provider,
        base_url: profile.base_url,
        model: profile.model,
        api_key: '',
        temperature: profile.temperature,
        max_tokens: profile.max_tokens,
        timeout_seconds: profile.timeout_seconds,
        thinking_mode: profile.thinking_mode,
    };
}

function profileStatus(profile: AIProviderProfile | null): string {
    if (!profile) return 'Not configured';
    if (profile.test_status === 'passed') return 'Connection verified';
    if (profile.test_status === 'failed') return 'Connection failed';
    if (profile.test_status === 'environment') return 'Render fallback';
    return 'Waiting for test';
}

// AI Settings Panel (manages a tested draft before hot-switching live response generation)
export function AISettingsPanel({ t, developerToken, onProviderActivated, onDeveloperModeExpired }: AISettingsPanelProps) {
    const [settings, setSettings] = useState<AISettingsState | null>(null);
    const [form, setForm] = useState<AIProviderForm>(emptyForm);
    const [pendingAction, setPendingAction] = useState<PendingAction>('load');
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');
    const [isDirty, setIsDirty] = useState(false);

    const preset = useMemo<ProviderPreset>(() => {
        if (form.provider === 'gemini') return 'gemini';
        return form.base_url.toLowerCase().includes('deepseek.com') ? 'deepseek' : 'custom';
    }, [form.base_url, form.provider]);

    const loadSettings = async () => {
        setPendingAction('load');
        setError('');
        try {
            const response = await authenticatedFetch(`${API_URL}/api/admin/ai-settings`, {
                headers: { 'X-Developer-Token': developerToken },
            });
            const data = await readJson<AISettingsState & ApiErrorBody>(response);
            if ([401, 403].includes(response.status)) onDeveloperModeExpired();
            if (!response.ok) throw new Error(data.detail || 'Unable to load AI settings.');
            setSettings(data);
            setForm(profileToForm(data.draft || data.active));
            setIsDirty(false);
        } catch (caughtError) {
            setError(caughtError instanceof Error ? caughtError.message : 'Unable to load AI settings.');
        } finally {
            setPendingAction(null);
        }
    };

    useEffect(() => {
        void loadSettings();
    }, [developerToken]);

    const selectPreset = (nextPreset: ProviderPreset) => {
        setNotice('');
        setError('');
        setIsDirty(true);
        if (nextPreset === 'gemini') {
            setForm((current) => ({
                ...current,
                display_name: 'Gemini',
                provider: 'gemini',
                base_url: 'https://generativelanguage.googleapis.com/v1beta',
                model: 'gemini-3.1-flash-lite',
                thinking_mode: 'disabled',
                api_key: '',
            }));
            return;
        }
        if (nextPreset === 'deepseek') {
            setForm((current) => ({
                ...current,
                display_name: 'DeepSeek V4 Flash',
                provider: 'openai_compatible',
                base_url: 'https://api.deepseek.com',
                model: 'deepseek-v4-flash',
                thinking_mode: 'disabled',
                api_key: '',
            }));
            return;
        }
        setForm((current) => ({
            ...current,
            display_name: current.provider === 'openai_compatible' ? current.display_name : 'Custom AI provider',
            provider: 'openai_compatible',
            base_url: current.provider === 'openai_compatible' ? current.base_url : 'https://',
            model: current.provider === 'openai_compatible' ? current.model : '',
            api_key: '',
        }));
    };

    const updateForm = <K extends keyof AIProviderForm>(field: K, value: AIProviderForm[K]) => {
        setForm((current) => ({ ...current, [field]: value }));
        setIsDirty(true);
        setNotice('');
    };

    const readActionResult = async (response: Response): Promise<AISettingsState> => {
        const data = await readJson<AISettingsState & ApiErrorBody>(response);
        if ([401, 403].includes(response.status)) onDeveloperModeExpired();
        if (!response.ok) throw new Error(data.detail || 'The operation could not be completed.');
        return data;
    };

    const saveDraft = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setPendingAction('save');
        setNotice('');
        setError('');
        try {
            const response = await authenticatedFetch(`${API_URL}/api/admin/ai-settings/draft`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'X-Developer-Token': developerToken },
                body: JSON.stringify({ ...form, api_key: form.api_key.trim() || null }),
            });
            const data = await readActionResult(response);
            setSettings(data);
            setForm(profileToForm(data.draft || data.active));
            setIsDirty(false);
            setNotice(t.ai_draft_saved || 'Draft saved securely. Test it before activation.');
        } catch (caughtError) {
            if (caughtError instanceof Error && caughtError.message.toLowerCase().includes('developer mode')) {
                onDeveloperModeExpired();
            }
            setError(caughtError instanceof Error ? caughtError.message : 'Unable to save the draft.');
        } finally {
            setPendingAction(null);
        }
    };

    const runAction = async (action: Exclude<PendingAction, 'load' | 'save' | null>) => {
        if (action === 'activate' && !window.confirm(t.ai_activate_confirm || 'Activate this tested model for all new chat responses?')) return;
        if (action === 'rollback' && !window.confirm(t.ai_rollback_confirm || 'Restore the previously active response model?')) return;

        setPendingAction(action);
        setNotice('');
        setError('');
        try {
            const response = await authenticatedFetch(`${API_URL}/api/admin/ai-settings/${action}`, {
                method: 'POST',
                headers: { 'X-Developer-Token': developerToken },
            });
            const data = await readActionResult(response);
            setSettings(data);
            setForm(profileToForm(data.draft || data.active));
            setIsDirty(false);
            if (action === 'test') setNotice(t.ai_test_passed || 'Connection test passed. The live model has not changed yet.');
            if (action === 'activate') {
                setNotice(t.ai_activated || 'The new response model is active immediately.');
                onProviderActivated();
            }
            if (action === 'rollback') {
                setNotice(t.ai_rolled_back || 'The previous response model has been restored.');
                onProviderActivated();
            }
        } catch (caughtError) {
            if (caughtError instanceof Error && caughtError.message.toLowerCase().includes('developer mode')) {
                onDeveloperModeExpired();
            }
            setError(caughtError instanceof Error ? caughtError.message : 'The operation could not be completed.');
        } finally {
            setPendingAction(null);
        }
    };

    if (pendingAction === 'load') {
        return (
            <div className={`${cardStyle} flex min-h-64 items-center justify-center p-8`}>
                <Loader2 className="animate-spin text-amber-500" size={30} />
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Active Configuration (makes the live-vs-draft state explicit before any change) */}
            <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
                <div className={`${cardStyle} p-5 sm:p-7`}>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-4">
                            <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                                <Zap size={24} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">{t.ai_active_model || 'Active response model'}</p>
                                <h3 className="truncate text-xl font-black text-slate-900 dark:text-white">{settings?.active.display_name}</h3>
                                <p className="truncate text-xs text-slate-500">{settings?.active.model} · {settings?.active.provider}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 self-start rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
                            <CheckCircle2 size={14} /> Live
                        </div>
                    </div>
                    <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50/80 p-4 text-xs leading-relaxed text-blue-800 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
                        <strong>{t.ai_render_note_title || 'Render behavior:'}</strong>{' '}
                        {t.ai_render_note || 'Website settings override GOOGLE_API_KEY immediately. The Render value is not edited and remains the safe fallback after restarts.'}
                    </div>
                </div>

                <div className={`${cardStyle} p-5 sm:p-7`}>
                    <div className="flex items-center gap-3">
                        <Database className="text-blue-500" size={22} />
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t.ai_embedding_model || 'Embedding model'}</p>
                            <h3 className="font-black text-slate-900 dark:text-white">{settings?.embedding.model}</h3>
                        </div>
                    </div>
                    <p className="mt-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                        {t.ai_embedding_locked || 'Kept on Gemini so existing document vectors remain compatible. Changing the response model does not re-index documents.'}
                    </p>
                </div>
            </div>

            {/* Provider Draft Form (collects a secret once and keeps live traffic unchanged until activation) */}
            <form onSubmit={saveDraft} className={`${cardStyle} p-5 sm:p-7`}>
                <div className="mb-6 flex items-center gap-3">
                    <div className="rounded-2xl bg-amber-100 p-3 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"><Bot size={24} /></div>
                    <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white">{t.ai_provider_configuration || 'Response provider configuration'}</h3>
                        <p className="text-xs text-slate-500">{t.ai_provider_description || 'Save a draft, verify the connection, then activate it.'}</p>
                    </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                    <label className="space-y-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                        {t.ai_provider_preset || 'Provider preset'}
                        <select value={preset} onChange={(event) => selectPreset(event.target.value as ProviderPreset)} className={inputStyle}>
                            <option value="gemini">Google Gemini</option>
                            <option value="deepseek">DeepSeek</option>
                            <option value="custom">Custom OpenAI-compatible</option>
                        </select>
                    </label>
                    <label className="space-y-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                        {t.ai_display_name || 'Display name'}
                        <input value={form.display_name} onChange={(event) => updateForm('display_name', event.target.value)} className={inputStyle} required />
                    </label>
                    <label className="space-y-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 md:col-span-2">
                        {t.ai_base_url || 'API base URL'}
                        <input type="url" value={form.base_url} onChange={(event) => updateForm('base_url', event.target.value)} className={inputStyle} required />
                    </label>
                    <label className="space-y-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                        {t.ai_model_id || 'Model ID'}
                        <input value={form.model} onChange={(event) => updateForm('model', event.target.value)} className={inputStyle} required />
                    </label>
                    <label className="space-y-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                        <span className="flex items-center gap-2"><KeyRound size={14} /> {t.ai_api_key || 'API key'}</span>
                        <input
                            type="password"
                            value={form.api_key}
                            onChange={(event) => updateForm('api_key', event.target.value)}
                            placeholder={settings?.draft?.has_api_key || settings?.active.has_api_key ? (t.ai_key_unchanged || 'Leave blank to keep the saved key') : 'sk-...'}
                            className={inputStyle}
                            autoComplete="new-password"
                        />
                    </label>
                    <label className="space-y-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                        {t.ai_temperature || 'Temperature'}
                        <input type="number" min="0" max="2" step="0.1" value={form.temperature} onChange={(event) => updateForm('temperature', Number(event.target.value))} className={inputStyle} />
                    </label>
                    <label className="space-y-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                        {t.ai_max_tokens || 'Maximum output tokens'}
                        <input type="number" min="32" max="32768" value={form.max_tokens} onChange={(event) => updateForm('max_tokens', Number(event.target.value))} className={inputStyle} />
                    </label>
                    <label className="space-y-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                        {t.ai_timeout || 'Request timeout (seconds)'}
                        <input type="number" min="5" max="120" value={form.timeout_seconds} onChange={(event) => updateForm('timeout_seconds', Number(event.target.value))} className={inputStyle} />
                    </label>
                    <label className="space-y-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                        {t.ai_thinking_mode || 'Thinking mode'}
                        <select value={form.thinking_mode} onChange={(event) => updateForm('thinking_mode', event.target.value as 'enabled' | 'disabled')} className={inputStyle}>
                            <option value="disabled">{t.ai_thinking_disabled || 'Disabled — faster and cheaper'}</option>
                            <option value="enabled">{t.ai_thinking_enabled || 'Enabled — deeper reasoning'}</option>
                        </select>
                    </label>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <button type="submit" disabled={pendingAction !== null} className={`${primaryButtonStyle} sm:w-auto sm:px-6`}>
                        {pendingAction === 'save' ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
                        {t.ai_save_draft || 'Save secure draft'}
                    </button>
                    <button type="button" disabled={!settings?.draft || isDirty || pendingAction !== null} onClick={() => void runAction('test')} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-300 bg-blue-50 px-5 text-sm font-black text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                        {pendingAction === 'test' ? <Loader2 className="animate-spin" size={17} /> : <FlaskConical size={17} />}
                        {t.ai_test_connection || 'Test connection'}
                    </button>
                    <button type="button" disabled={settings?.draft?.test_status !== 'passed' || pendingAction !== null} onClick={() => void runAction('activate')} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-black text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40">
                        {pendingAction === 'activate' ? <Loader2 className="animate-spin" size={17} /> : <ShieldCheck size={17} />}
                        {t.ai_activate || 'Activate'}
                    </button>
                    <button type="button" disabled={!settings?.previous || pendingAction !== null} onClick={() => void runAction('rollback')} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 text-sm font-black text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-white/5">
                        {pendingAction === 'rollback' ? <Loader2 className="animate-spin" size={17} /> : <RotateCcw size={17} />}
                        {t.ai_rollback || 'Rollback'}
                    </button>
                </div>

                {settings?.draft && (
                    <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-white/10 dark:bg-black/20 dark:text-slate-300">
                        <strong>{t.ai_draft_status || 'Draft status'}:</strong> {profileStatus(settings.draft)}
                        {settings.draft.latency_ms ? ` · ${settings.draft.latency_ms} ms` : ''}
                        {' · '}{settings.draft.has_api_key ? (t.ai_key_secured || 'API key secured') : (t.ai_key_missing || 'API key missing')}
                    </div>
                )}
                {notice && <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">{notice}</p>}
                {error && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">{error}</p>}
            </form>
        </div>
    );
}
