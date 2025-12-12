import { useState, useCallback } from 'react';
import { CustomAlert } from '@/components/common/CustomAlert';

interface AlertButton {
  text: string;
  onPress: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertOptions {
  title: string;
  message: string;
  buttonText?: string;
  buttons?: AlertButton[];
  showIcon?: boolean;
  iconName?: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  iconColor?: string;
}

export function useAlert() {
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertOptions | null>(null);

  const showAlert = useCallback((options: AlertOptions) => {
    setAlertConfig(options);
    setAlertVisible(true);
  }, []);

  const hideAlert = useCallback(() => {
    setAlertVisible(false);
    // Clear config after animation
    setTimeout(() => {
      setAlertConfig(null);
    }, 300);
  }, []);

  const AlertComponent = alertConfig ? (
    <CustomAlert
      visible={alertVisible}
      title={alertConfig.title}
      message={alertConfig.message}
      onClose={hideAlert}
      buttonText={alertConfig.buttonText}
      buttons={alertConfig.buttons}
      showIcon={alertConfig.showIcon}
      iconName={alertConfig.iconName}
      iconColor={alertConfig.iconColor}
    />
  ) : null;

  return {
    showAlert,
    hideAlert,
    AlertComponent,
  };
}












