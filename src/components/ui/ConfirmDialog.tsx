import React, { createContext, useContext, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../../theme/tokens';
import { BlurView } from 'expo-blur';
import { log } from '../../lib/logger';

export interface ConfirmDialogConfig {
  id: string;
  title: string;
  message?: string;
  type?: 'default' | 'danger' | 'warning' | 'success';
  confirmLabel?: string;
  cancelLabel?: string;
  showIcon?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

interface ConfirmDialogContextType {
  showConfirmDialog: (config: Omit<ConfirmDialogConfig, 'id'>) => void;
  hideConfirmDialog: (id: string) => void;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextType | null>(null);

export const useConfirmDialog = () => {
  const context = useContext(ConfirmDialogContext);
  if (!context) {
    throw new Error('useConfirmDialog must be used within a ConfirmDialogProvider');
  }
  return context;
};

const getDialogIcon = (type: ConfirmDialogConfig['type']) => {
  switch (type) {
    case 'danger': return 'warning';
    case 'warning': return 'alert-circle';
    case 'success': return 'checkmark-circle';
    default: return 'help-circle';
  }
};

const getDialogColors = (type: ConfirmDialogConfig['type']) => {
  switch (type) {
    case 'danger':
      return {
        icon: '#EF4444',
        confirmButton: '#EF4444',
        confirmText: '#FFFFFF',
      };
    case 'warning':
      return {
        icon: '#F59E0B',
        confirmButton: '#F59E0B',
        confirmText: '#FFFFFF',
      };
    case 'success':
      return {
        icon: '#10B981',
        confirmButton: '#10B981',
        confirmText: '#FFFFFF',
      };
    default:
      return {
        icon: colors.accent,
        confirmButton: colors.accent,
        confirmText: colors.accentText,
      };
  }
};

interface ConfirmDialogItemProps {
  dialog: ConfirmDialogConfig & { isLoading?: boolean };
  onDismiss: (id: string) => void;
}

const ConfirmDialogItem: React.FC<ConfirmDialogItemProps> = ({ dialog, onDismiss }) => {
  const [isLoading, setIsLoading] = useState(false);
  const dialogColors = getDialogColors(dialog.type);
  const icon = getDialogIcon(dialog.type);

  const handleConfirm = async () => {
    try {
      setIsLoading(true);
      await dialog.onConfirm();
      onDismiss(dialog.id);
    } catch (error) {
      log.error('ConfirmDialog', 'Confirm dialog error', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    dialog.onCancel?.();
    onDismiss(dialog.id);
  };

  const handleBackdropPress = () => {
    if (!isLoading) {
      handleCancel();
    }
  };

  return (
    <Modal visible={true} transparent animationType="fade" statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={handleBackdropPress}>
        <BlurView intensity={10} style={StyleSheet.absoluteFill} />
        <View style={styles.dialogContainer}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={styles.dialog}>
              {dialog.showIcon !== false && (
                <View style={styles.iconContainer}>
                  <Ionicons 
                    name={icon as any} 
                    size={48} 
                    color={dialogColors.icon}
                  />
                </View>
              )}

              <View style={styles.content}>
                <Text style={styles.title}>{dialog.title}</Text>
                {dialog.message && (
                  <Text style={styles.message}>{dialog.message}</Text>
                )}
              </View>

              <View style={styles.actions}>
                <Pressable
                  style={[styles.button, styles.cancelButton]}
                  onPress={handleCancel}
                  disabled={isLoading}
                >
                  <Text style={styles.cancelButtonText}>
                    {dialog.cancelLabel || 'Cancel'}
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.button,
                    styles.confirmButton,
                    { backgroundColor: dialogColors.confirmButton },
                    isLoading && styles.buttonLoading,
                  ]}
                  onPress={handleConfirm}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <View style={styles.loadingContainer}>
                      <View style={styles.loadingSpinner} />
                      <Text style={[styles.confirmButtonText, { color: dialogColors.confirmText }]}>
                        Loading...
                      </Text>
                    </View>
                  ) : (
                    <Text style={[styles.confirmButtonText, { color: dialogColors.confirmText }]}>
                      {dialog.confirmLabel || 'Confirm'}
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
};

interface ConfirmDialogProviderProps {
  children: React.ReactNode;
}

export const ConfirmDialogProvider: React.FC<ConfirmDialogProviderProps> = ({ children }) => {
  const [dialogs, setDialogs] = useState<ConfirmDialogConfig[]>([]);

  const showConfirmDialog = useCallback((config: Omit<ConfirmDialogConfig, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const dialog = { ...config, id };
    setDialogs(prev => [...prev, dialog]);
  }, []);

  const hideConfirmDialog = useCallback((id: string) => {
    setDialogs(prev => prev.filter(dialog => dialog.id !== id));
  }, []);

  // Only show the most recent dialog
  const currentDialog = dialogs[dialogs.length - 1];

  return (
    <ConfirmDialogContext.Provider value={{ showConfirmDialog, hideConfirmDialog }}>
      {children}
      {currentDialog && (
        <ConfirmDialogItem
          dialog={currentDialog}
          onDismiss={hideConfirmDialog}
        />
      )}
    </ConfirmDialogContext.Provider>
  );
};

// Convenience hook for common confirm dialogs
export const useQuickConfirm = () => {
  const { showConfirmDialog } = useConfirmDialog();

  const confirmDelete = useCallback((
    itemName: string,
    onConfirm: () => void | Promise<void>
  ) => {
    showConfirmDialog({
      type: 'danger',
      title: `Delete ${itemName}?`,
      message: 'This action cannot be undone.',
      confirmLabel: 'Delete',
      onConfirm,
    });
  }, [showConfirmDialog]);

  const confirmAction = useCallback((
    title: string,
    message: string,
    onConfirm: () => void | Promise<void>
  ) => {
    showConfirmDialog({
      title,
      message,
      onConfirm,
    });
  }, [showConfirmDialog]);

  const confirmLeave = useCallback((onConfirm: () => void | Promise<void>) => {
    showConfirmDialog({
      type: 'warning',
      title: 'Unsaved Changes',
      message: 'You have unsaved changes. Are you sure you want to leave?',
      confirmLabel: 'Leave',
      onConfirm,
    });
  }, [showConfirmDialog]);

  return {
    confirmDelete,
    confirmAction,
    confirmLeave,
  };
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  dialogContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing(3),
    width: '100%',
  },
  dialog: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: spacing(3),
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing(2),
  },
  content: {
    alignItems: 'center',
    marginBottom: spacing(3),
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing(1),
  },
  message: {
    fontSize: 14,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing(1.5),
  },
  button: {
    flex: 1,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(2),
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  cancelButton: {
    backgroundColor: colors.chipBg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  confirmButton: {
    // backgroundColor set dynamically
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    // color set dynamically
  },
  buttonLoading: {
    opacity: 0.8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  loadingSpinner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderTopColor: '#FFFFFF',
    // Note: You might want to add a rotating animation here
  },
});