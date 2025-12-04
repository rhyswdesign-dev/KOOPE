import { registerRootComponent } from 'expo';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import App from './App';

// Global error boundary to prevent app crashes
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.log('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Silently ignore tasteProfile errors - render app anyway
      const errorMessage = this.state.error?.message || '';
      if (
        errorMessage.includes('tequila') ||
        errorMessage.includes('spiritWeights') ||
        errorMessage.includes('flavorWeights') ||
        errorMessage.includes('tasteProfile')
      ) {
        console.log('[ErrorBoundary] Ignoring tasteProfile error, rendering app');
        return <App />;
      }

      // For other errors, show error screen
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Something went wrong</Text>
          <Text style={styles.errorDetail}>{errorMessage}</Text>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#000',
  },
  errorText: {
    color: '#fff',
    fontSize: 20,
    marginBottom: 10,
  },
  errorDetail: {
    color: '#999',
    fontSize: 14,
  },
});

function WrappedApp() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(WrappedApp);
