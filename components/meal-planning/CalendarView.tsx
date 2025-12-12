import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface CalendarViewProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  mealPlans: Array<{ date: string; [key: string]: any }>;
}

export function CalendarView({
  currentDate,
  onDateChange,
  selectedDate,
  onDateSelect,
  mealPlans,
}: CalendarViewProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const monthNames = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
  ];

  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: Array<{ day: number; date: Date; hasMeal: boolean }> = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ day: 0, date: new Date(year, month, 0), hasMeal: false });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, month, day);
      const dateStr = dateObj.toISOString().split('T')[0];
      const hasMeal = mealPlans.some(plan => {
        const planDate = typeof plan.date === 'string' ? plan.date : (plan.date ? String(plan.date) : '');
        return planDate === dateStr && (plan.breakfast || plan.lunch || plan.dinner || plan.snack);
      });
      days.push({ day, date: dateObj, hasMeal });
    }

    return days;
  };

  const handlePrevMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    onDateChange(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    onDateChange(newDate);
  };

  const days = getDaysInMonth(currentDate);
  const today = new Date();
  const isToday = (date: Date) => {
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: Date) => {
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  return (
    <View style={[
      styles.calendarContainer, 
      { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }
    ]}>
      {/* Month Header */}
      <View style={styles.monthHeader}>
        <TouchableOpacity 
          onPress={handlePrevMonth} 
          style={[styles.monthNavButton, { backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5' }]} 
          activeOpacity={0.7}
        >
          <MaterialIcons name="chevron-left" size={24} color={colors.primary} />
        </TouchableOpacity>
        
        <View style={styles.monthTitleContainer}>
          <ThemedText style={[styles.monthText, { color: isDark ? '#FFFFFF' : '#1A1A1A' }]}>
            {monthNames[currentDate.getMonth()]}
          </ThemedText>
          <ThemedText style={[styles.yearText, { color: isDark ? '#888' : '#666' }]}>
            {currentDate.getFullYear()}
          </ThemedText>
        </View>
        
        <TouchableOpacity 
          onPress={handleNextMonth} 
          style={[styles.monthNavButton, { backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5' }]} 
          activeOpacity={0.7}
        >
          <MaterialIcons name="chevron-right" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Day Names Header */}
      <View style={styles.daysHeader}>
        {dayNames.map((day, index) => (
          <View key={index} style={styles.dayHeaderCell}>
            <ThemedText style={[
              styles.dayHeaderText, 
              { color: isDark ? '#888' : '#999' },
              index === 0 && styles.sundayText // Sunday
            ]}>
              {day}
            </ThemedText>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.calendarGrid}>
        {days.map((dayInfo, index) => {
          if (dayInfo.day === 0) {
            return <View key={index} style={styles.calendarCell} />;
          }

          const dayIsToday = isToday(dayInfo.date);
          const dayIsSelected = isSelected(dayInfo.date);
          const isSunday = dayInfo.date.getDay() === 0;

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.calendarCell,
                dayIsToday && [styles.todayCell, { backgroundColor: colors.primary }],
                dayIsSelected && !dayIsToday && [
                  styles.selectedCell, 
                  { 
                    borderColor: colors.primary,
                    backgroundColor: isDark ? colors.primary + '20' : colors.primary + '10'
                  }
                ],
              ]}
              onPress={() => onDateSelect(dayInfo.date)}
              activeOpacity={0.6}
            >
              <ThemedText
                style={[
                  styles.dayNumber,
                  { color: isDark ? '#FFFFFF' : '#333' },
                  isSunday && !dayIsToday && !dayIsSelected && { color: colors.error },
                  dayIsToday && styles.todayText,
                  dayIsSelected && !dayIsToday && { color: colors.primary, fontWeight: '700' },
                ]}
              >
                {dayInfo.day}
              </ThemedText>
              {dayInfo.hasMeal && (
                <View style={[
                  styles.mealDot, 
                  { backgroundColor: dayIsToday ? '#FFFFFF' : colors.primary }
                ]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Legend */}
      <View style={[styles.legend, { borderTopColor: isDark ? '#2A2A2A' : '#F0F0F0' }]}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <ThemedText style={[styles.legendText, { color: isDark ? '#888' : '#999' }]}>
            Có món ăn
          </ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendToday, { backgroundColor: colors.primary }]} />
          <ThemedText style={[styles.legendText, { color: isDark ? '#888' : '#999' }]}>
            Hôm nay
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  calendarContainer: {
    padding: 16,
    borderRadius: 20,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  monthNavButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitleContainer: {
    alignItems: 'center',
  },
  monthText: {
    fontSize: 20,
    fontWeight: '700',
  },
  yearText: {
    fontSize: 13,
    marginTop: 2,
  },
  daysHeader: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.1)',
  },
  dayHeaderCell: {
    flex: 1,
    alignItems: 'center',
  },
  dayHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  sundayText: {
    color: '#E63946',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  todayCell: {
    borderRadius: 12,
    margin: 2,
  },
  selectedCell: {
    borderRadius: 12,
    borderWidth: 2,
    margin: 2,
  },
  dayNumber: {
    fontSize: 15,
    fontWeight: '500',
  },
  todayText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  mealDot: {
    position: 'absolute',
    bottom: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendToday: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
  },
});
