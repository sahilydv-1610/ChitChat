import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 text-white p-8">
                    <div className="bg-red-900 p-6 rounded-lg max-w-2xl w-full border border-red-500 shadow-2xl">
                        <h1 className="text-3xl font-bold mb-4">Something went wrong.</h1>
                        <p className="mb-4 text-xl">The application crashed with the following error:</p>
                        <pre className="bg-black p-4 rounded overflow-auto text-red-300 font-mono text-sm max-h-64">
                            {this.state.error && this.state.error.toString()}
                            <br />
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </pre>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-6 px-6 py-3 bg-white text-red-900 font-bold rounded hover:bg-gray-200 transition"
                        >
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export { ErrorBoundary };
export default ErrorBoundary;
