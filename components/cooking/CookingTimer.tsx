import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';

interface CookingTimerProps {
  visible: boolean;
  onClose: () => void;
  onStart: (expectedMinutes: number) => void;
  mealName: string;
  cookingStartTime?: string | null;
  expectedTime?: number | null;
}

export function CookingTimer({
  visible,
  onClose,
  onStart,
  mealName,
  cookingStartTime,
  expectedTime,
}: CookingTimerProps) {
  const [expectedMinutes, setExpectedMinutes] = useState(30);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notificationSentRef = useRef(false);

  // Check if timer is already running from props
  useEffect(() => {
    if (cookingStartTime && expectedTime) {
      setIsRunning(true);
      setExpectedMinutes(expectedTime);
      const startTime = new Date(cookingStartTime);
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      setElapsedSeconds(elapsed);
    } else {
      setIsRunning(false);
      setElapsedSeconds(0);
      notificationSentRef.current = false;
    }
  }, [cookingStartTime, expectedTime]);

  // Update timer every second
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          const newElapsed = prev + 1;
          
          // Check if we should send notification (when time is up)
          const expectedSeconds = expectedMinutes * 60;
          if (newElapsed >= expectedSeconds && !notificationSentRef.current) {
            sendTimerNotification();
            notificationSentRef.current = true;
          }
          
          return newElapsed;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, expectedMinutes]);

  const sendTimerNotification = async () => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Hết giờ nấu ăn!',
          body: `${mealName} đã đến thời gian hoàn thành. Hãy kiểm tra món ăn nhé!`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.error('Error sending timer notification:', error);
    }
  };

  const handleStart = () => {
    if (expectedMinutes <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập thời gian hợp lệ');
      return;
    }

    onStart(expectedMinutes);
    setIsRunning(true);
    setElapsedSeconds(0);
    notificationSentRef.current = false;
  };

  const handleStop = () => {
    Alert.alert(
      'Dừng timer',
      'Bạn có chắc muốn dừng timer? Điểm exp có thể bị giảm nếu nấu không đúng giờ.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Dừng',
          style: 'destructive',
          onPress: () => {
            setIsRunning(false);
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
            }
          },
        },
      ]
    );
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const expectedSeconds = expectedMinutes * 60;
  const delay = elapsedSeconds - expectedSeconds;
  const delayMinutes = Math.floor(delay / 60);
  const isOvertime = delay > 0;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Ionicons name="timer-outline" size={24} color="#FF6B35" />
              <Text style={styles.title}>Timer nấu ăn</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <Text style={styles.mealName}>{mealName}</Text>

          {!isRunning ? (
            // Setup phase
            <View style={styles.setupContainer}>
              <Text style={styles.label}>Thời gian dự kiến (phút):</Text>
              <View style={styles.timeInputContainer}>
                <TouchableOpacity
                  onPress={() => setExpectedMinutes(Math.max(5, expectedMinutes - 5))}
                  style={styles.timeButton}
                >
                  <Ionicons name="remove" size={24} color="#FF6B35" />
                </TouchableOpacity>
                <Text style={styles.timeValue}>{expectedMinutes}</Text>
                <TouchableOpacity
                  onPress={() => setExpectedMinutes(Math.min(180, expectedMinutes + 5))}
                  style={styles.timeButton}
                >
                  <Ionicons name="add" size={24} color="#FF6B35" />
                </TouchableOpacity>
              </View>

              <View style={styles.hintContainer}>
                <Ionicons name="bulb-outline" size={18} color="#FFB84D" />
                <Text style={styles.hint}>
                  Nấu đúng giờ để nhận full {12} exp!
                  {'\n'}Trễ hơn sẽ bị giảm exp.
                </Text>
              </View>

              <TouchableOpacity onPress={handleStart} style={styles.startButton}>
                <Ionicons name="play" size={24} color="#fff" />
                <Text style={styles.startButtonText}>Bắt đầu nấu</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // Running phase
            <View style={styles.runningContainer}>
              <View style={styles.timerDisplay}>
                <Text style={[styles.timerText, isOvertime && styles.overtimeText]}>
                  {formatTime(elapsedSeconds)}
                </Text>
                <Text style={styles.expectedText}>
                  Dự kiến: {formatTime(expectedSeconds)}
                </Text>
              </View>

              {isOvertime && (
                <View style={styles.warningBox}>
                  <Ionicons name="warning" size={20} color="#E63946" />
                  <Text style={styles.warningText}>
                    Trễ {delayMinutes > 0 ? `${delayMinutes} phút` : `${delay} giây`}
                  </Text>
                </View>
              )}

              {!isOvertime && delay > -300 && (
                <View style={styles.infoBox}>
                  <Ionicons name="information-circle" size={20} color="#4CAF50" />
                  <Text style={styles.infoText}>
                    Còn {Math.floor((expectedSeconds - elapsedSeconds) / 60)} phút
                  </Text>
                </View>
              )}

              <View style={styles.expPreview}>
                <Text style={styles.expPreviewLabel}>EXP dự kiến:</Text>
                <View style={styles.expPreviewValueContainer}>
                  {delay <= 300 ? (
                    <>
                      <Text style={styles.expPreviewValue}>12 exp</Text>
                      <Ionicons name="star" size={20} color="#FFB84D" />
                    </>
                  ) : delay <= 900 ? (
                    <>
                      <Text style={styles.expPreviewValue}>10 exp</Text>
                      <Ionicons name="warning" size={18} color="#FF9500" />
                      <Text style={styles.expPreviewPenalty}>(-2)</Text>
                    </>
                  ) : delay <= 1800 ? (
                    <>
                      <Text style={styles.expPreviewValue}>8 exp</Text>
                      <Ionicons name="warning" size={18} color="#FF9500" />
                      <Text style={styles.expPreviewPenalty}>(-4)</Text>
                    </>
                  ) : delay <= 3600 ? (
                    <>
                      <Text style={styles.expPreviewValue}>6 exp</Text>
                      <Ionicons name="warning" size={18} color="#E63946" />
                      <Text style={styles.expPreviewPenalty}>(-6)</Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.expPreviewValue}>4 exp</Text>
                      <Ionicons name="close-circle" size={18} color="#E63946" />
                      <Text style={styles.expPreviewPenalty}>(-8)</Text>
                    </>
                  )}
                </View>
              </View>

              <TouchableOpacity onPress={handleStop} style={styles.stopButton}>
                <Ionicons name="stop" size={24} color="#fff" />
                <Text style={styles.stopButtonText}>Dừng timer</Text>
              </TouchableOpacity>

              <Text style={styles.finishHint}>
                Hoàn thành nấu ăn rồi? Đóng timer và tick "Đã nấu" để nhận exp!
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  mealName: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  setupContainer: {
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  timeButton: {
    backgroundColor: '#FFF5F0',
    padding: 12,
    borderRadius: 12,
  },
  timeValue: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginHorizontal: 30,
    minWidth: 80,
    textAlign: 'center',
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  hint: {
    fontSize: 14,
    color: '#666',
    textAlign: 'left',
    flex: 1,
    lineHeight: 20,
  },
  startButton: {
    backgroundColor: '#FF6B35',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  runningContainer: {
    alignItems: 'center',
  },
  timerDisplay: {
    alignItems: 'center',
    marginBottom: 16,
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  overtimeText: {
    color: '#E63946',
  },
  expectedText: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  warningText: {
    color: '#E63946',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  infoText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  expPreview: {
    backgroundColor: '#FFF5F0',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  expPreviewLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  expPreviewValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  expPreviewValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  expPreviewPenalty: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E63946',
  },
  stopButton: {
    backgroundColor: '#E63946',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    marginBottom: 12,
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  finishHint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

