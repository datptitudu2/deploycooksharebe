import React from 'react';
import { StyleSheet, Text, Linking, TouchableOpacity, Platform, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface MessageTextProps {
  text: string;
  isUser: boolean;
}

export function MessageText({ text, isUser }: MessageTextProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const textColor = isUser ? '#FFFFFF' : (colorScheme === 'dark' ? '#FFFFFF' : '#000000');

  // Parse text and format nicely
  const parseText = (text: string) => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    const matches: Array<{ start: number; end: number; type: string; content: string; link?: string }> = [];

    // Match patterns: **bold**, [Video: ... - link], numbered lists, bullet points, line breaks
    const patterns = [
      { regex: /\*\*(.*?)\*\*/g, type: 'bold' },
      { regex: /\[Video:\s*([^\]]+)\]/g, type: 'video' },
      { regex: /(https?:\/\/[^\s\)]*youtube\.com[^\s\)]*)/gi, type: 'youtube-link' }, // YouTube links riêng để format đẹp
      { regex: /(https?:\/\/[^\s\)]+)/g, type: 'link' },
      { regex: /(\d+\.\s+[^\n]+)/g, type: 'numbered' },
      { regex: /(-\s+[^\n]+)/g, type: 'bullet' },
    ];

    patterns.forEach(({ regex, type }) => {
      let match;
      regex.lastIndex = 0;
      while ((match = regex.exec(text)) !== null) {
        if (type === 'video') {
          const videoMatch = match[1].match(/(.+?)\s*-\s*(https?:\/\/[^\s\)]+)/);
          if (videoMatch) {
            matches.push({
              start: match.index,
              end: match.index + match[0].length,
              type: 'video',
              content: videoMatch[1].trim(),
              link: videoMatch[2],
            });
          }
        } else if (type === 'youtube-link') {
          // Format YouTube links đẹp hơn
          matches.push({
            start: match.index,
            end: match.index + match[0].length,
            type: 'youtube-link',
            content: 'Mở YouTube',
            link: match[0],
          });
        } else if (type === 'link') {
          matches.push({
            start: match.index,
            end: match.index + match[0].length,
            type: 'link',
            content: match[0],
            link: match[0],
          });
        } else {
          matches.push({
            start: match.index,
            end: match.index + match[0].length,
            type,
            content: match[1] || match[0],
          });
        }
      }
    });

    // Sort matches by position
    matches.sort((a, b) => a.start - b.start);

    // Build parts
    matches.forEach((match, index) => {
      // Add text before match
      if (match.start > lastIndex) {
        const beforeText = text.substring(lastIndex, match.start);
        if (beforeText) {
          // Nếu text trước đó là "Video hướng dẫn:", giảm margin bottom
          const isVideoHeader = beforeText.trim().includes('Video hướng dẫn');
          parts.push(
            <Text 
              key={`text-${index}`} 
              style={[
                styles.text, 
                { color: textColor },
                isVideoHeader && { marginBottom: Platform.OS === 'android' ? -4 : -2 }
              ]}
            >
              {beforeText}
            </Text>
          );
        }
      }

      // Add formatted match
      if (match.type === 'bold') {
        parts.push(
          <Text key={`bold-${index}`} style={[styles.text, styles.bold, { color: textColor }]}>
            {match.content}
          </Text>
        );
      } else if (match.type === 'video' || match.type === 'link' || match.type === 'youtube-link') {
        parts.push(
          <View key={`link-wrapper-${index}`} style={styles.linkWrapper}>
            <TouchableOpacity
              key={`link-${index}`}
              onPress={async () => {
                if (match.link) {
                  // Nếu là YouTube link, thử mở YouTube app trước
                  if (match.type === 'youtube-link') {
                    try {
                      // Extract video ID từ URL
                      const videoIdMatch = match.link.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
                      if (videoIdMatch && videoIdMatch[1]) {
                        const youtubeAppUrl = `vnd.youtube:${videoIdMatch[1]}`;
                        const canOpen = await Linking.canOpenURL(youtubeAppUrl);
                        if (canOpen) {
                          await Linking.openURL(youtubeAppUrl);
                          return;
                        }
                      }
                    } catch (error) {
                      console.log('Cannot open YouTube app, using browser');
                    }
                  }
                  // Fallback to browser
                  await Linking.openURL(match.link);
                }
              }}
            >
              <Text style={[styles.text, styles.link, { color: colors.primary }]}>
                {match.type === 'video' ? `📹 ${match.content}` : match.type === 'youtube-link' ? `🎬 ${match.content}` : match.content}
              </Text>
            </TouchableOpacity>
          </View>
        );
      } else if (match.type === 'numbered' || match.type === 'bullet') {
        parts.push(
          <Text key={`list-${index}`} style={[styles.text, styles.listItem, { color: textColor }]}>
            {match.content}
            {'\n'}
          </Text>
        );
      }

      lastIndex = match.end;
    });

    // Add remaining text (loại bỏ YouTube links và các dòng liên quan đến video)
    if (lastIndex < text.length) {
      let remainingText = text.substring(lastIndex);
      // Loại bỏ YouTube links trong remaining text
      remainingText = remainingText.replace(/https?:\/\/[^\s\)]*youtube\.com[^\s\)]*/gi, '');
      // Loại bỏ dòng chỉ có "Video hướng dẫn:" và emoji nếu không có nội dung khác
      remainingText = remainingText.replace(/^\s*📺\s*\*\*Video hướng dẫn:\*\*\s*$/gm, '');
      remainingText = remainingText.replace(/^\s*🎬\s*$/gm, '');
      // Loại bỏ dòng bắt đầu bằng "Video:" (từ AI response)
      remainingText = remainingText.replace(/^\s*Video:\s*[^\n]*$/gmi, '');
      // Loại bỏ text "Mở YouTube" và các biến thể
      remainingText = remainingText.replace(/Mở\s+YouTube/gi, '');
      // Split by newlines to preserve line breaks
      const lines = remainingText.split('\n');
      lines.forEach((line, lineIndex) => {
        const trimmedLine = line.trim();
        // Bỏ qua dòng trống, chỉ có emoji/spacing, hoặc chứa "Video:"
        if (trimmedLine && 
            !trimmedLine.match(/^📺\s*\*\*Video hướng dẫn:\*\*\s*$/) && 
            !trimmedLine.match(/^🎬\s*$/) &&
            !trimmedLine.match(/^Video:\s*/i)) {
          parts.push(
            <Text key={`text-end-${lineIndex}`} style={[styles.text, { color: textColor }]}>
              {line}
            </Text>
          );
        }
        if (lineIndex < lines.length - 1 && trimmedLine && !trimmedLine.match(/^Video:\s*/i)) {
          parts.push(<Text key={`break-${lineIndex}`}>{'\n'}</Text>);
        }
      });
    }

    return parts.length > 0 ? parts : <Text style={[styles.text, { color: textColor }]}>{text}</Text>;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.textWrapper}>{parseText(text)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  textWrapper: {
    fontSize: Platform.OS === 'android' ? 15 : 16,
    lineHeight: Platform.OS === 'android' ? 26 : 24,
    letterSpacing: Platform.OS === 'android' ? 0.2 : 0,
  },
  text: {
    fontSize: Platform.OS === 'android' ? 15 : 16,
    lineHeight: Platform.OS === 'android' ? 26 : 24,
    letterSpacing: Platform.OS === 'android' ? 0.2 : 0,
    includeFontPadding: Platform.OS === 'android' ? false : undefined,
  },
  bold: {
    fontWeight: '700',
  },
  linkWrapper: {
    alignSelf: 'flex-start',
    marginLeft: 0,
    paddingLeft: 0,
    marginTop: Platform.OS === 'android' ? -6 : -4, // Lùi link lên trên
  },
  link: {
    textDecorationLine: 'underline',
    fontWeight: '600',
    alignSelf: 'flex-start',
    marginLeft: 0,
    paddingLeft: 0,
  },
  listItem: {
    marginLeft: 8,
    marginTop: Platform.OS === 'android' ? 6 : 4,
    marginBottom: Platform.OS === 'android' ? 4 : 2,
  },
});

