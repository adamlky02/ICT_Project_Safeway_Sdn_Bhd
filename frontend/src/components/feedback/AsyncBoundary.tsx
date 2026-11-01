import { Component, type ReactNode } from 'react';
import type { Translation } from '../../translations';
import { FeedbackBanner } from './FeedbackBanner';

// A failed route or lazy import remains recoverable, including after deployment.
export class AsyncBoundary extends Component<{ children: ReactNode; t: Translation }, { failed: boolean }> {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    render() {
        if (this.state.failed) {
            return <div className="mx-auto max-w-lg p-6"><FeedbackBanner tone="error" message={this.props.t.view_load_failed} actionLabel={this.props.t.reload_view} onAction={() => window.location.reload()} /></div>;
        }
        return this.props.children;
    }
}
