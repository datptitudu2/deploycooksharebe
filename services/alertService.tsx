import React, { useState, useCallback } from 'react';
import { CustomAlert } from '@/components/common/CustomAlert';

interface AlertButton {
  text: string;
  onPress: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertOptions {
  title: string;
  message: string;
  buttons?: AlertButton[];
  buttonText?: string;
  showIcon?: boolean;
  iconName?: any;
  iconColor?: string;
}

// Global alert state
let alertState: {
  visible: boolean;
  options: AlertOptions | null;
  resolve: ((value: void) => void) | null;
} = {
  visible: false,
  options: null,
  resolve: null,
};

let alertListeners: Array<() => void> = [];

const notifyListeners = () => {
  alertListeners.forEach(listener => listener());
};

export const alertService = {
  /**
   * Hiển thị alert với style đồng bộ
   */
  show: (options: AlertOptions): Promise<void> => {
    return new Promise((resolve) => {
      alertState = {
        visible: true,
        options,
        resolve,
      };
      notifyListeners();
    });
  },

  /**
   * Alert thành công
   */
  success: (message: string, title: string = 'Thành công'): Promise<void> => {
    return alertService.show({
      title: `✅ ${title}`,
      message,
      buttonText: 'Tuyệt vời!',
      showIcon: true,
      iconName: 'checkmark-circle',
      iconColor: '#4CAF50',
    });
  },

  /**
   * Alert lỗi
   */
  error: (message: string, title: string = 'Lỗi'): Promise<void> => {
    return alertService.show({
      title: `❌ ${title}`,
      message,
      buttonText: 'Đã hiểu',
      showIcon: true,
      iconName: 'close-circle',
      iconColor: '#FF3B30',
    });
  },

  /**
   * Alert cảnh báo
   */
  warning: (message: string, title: string = 'Cảnh báo'): Promise<void> => {
    return alertService.show({
      title: `⚠️ ${title}`,
      message,
      buttonText: 'Đã hiểu',
      showIcon: true,
      iconName: 'warning',
      iconColor: '#FFB347',
    });
  },

  /**
   * Alert thông tin
   */
  info: (message: string, title: string = 'Thông báo'): Promise<void> => {
    return alertService.show({
      title,
      message,
      buttonText: 'OK',
      showIcon: true,
      iconName: 'information-circle',
      iconColor: '#FF6B6B',
    });
  },

  /**
   * Alert xác nhận (có 2 nút)
   */
  confirm: (
    message: string,
    title: string = 'Xác nhận',
    onConfirm?: () => void,
    onCancel?: () => void
  ): Promise<void> => {
    return alertService.show({
      title,
      message,
      buttons: [
        {
          text: 'Hủy',
          onPress: onCancel || (() => {}),
          style: 'cancel',
        },
        {
          text: 'Xác nhận',
          onPress: onConfirm || (() => {}),
          style: 'default',
        },
      ],
      showIcon: true,
      iconName: 'help-circle',
      iconColor: '#FF6B6B',
    });
  },

  /**
   * Đóng alert
   */
  hide: () => {
    if (alertState.resolve) {
      alertState.resolve();
    }
    alertState = {
      visible: false,
      options: null,
      resolve: null,
    };
    notifyListeners();
  },

  /**
   * Subscribe để component có thể render alert
   */
  subscribe: (listener: () => void) => {
    alertListeners.push(listener);
    return () => {
      alertListeners = alertListeners.filter(l => l !== listener);
    };
  },

  /**
   * Get current state
   */
  getState: () => alertState,
};

/**
 * Hook để sử dụng Alert trong component
 */
export function useAlertService() {
  const [alertState, setAlertState] = useState(alertService.getState());

  React.useEffect(() => {
    const unsubscribe = alertService.subscribe(() => {
      setAlertState({ ...alertService.getState() });
    });
    return unsubscribe;
  }, []);

  return {
    show: alertService.show,
    success: alertService.success,
    error: alertService.error,
    warning: alertService.warning,
    info: alertService.info,
    confirm: alertService.confirm,
    AlertComponent: alertState.visible && alertState.options ? (
      <CustomAlert
        visible={alertState.visible}
        title={alertState.options.title}
        message={alertState.options.message}
        onClose={alertService.hide}
        buttons={alertState.options.buttons}
        buttonText={alertState.options.buttonText}
        showIcon={alertState.options.showIcon}
        iconName={alertState.options.iconName}
        iconColor={alertState.options.iconColor}
      />
    ) : null,
  };
}

