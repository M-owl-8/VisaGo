import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useChatStore } from "../../store/chat";
import { colors } from "../../theme/colors";

export const ChatScreen = ({ route }: any) => {
  const insets = useSafeAreaInsets();
  const applicationId = route?.params?.applicationId;

  const {
    currentConversation,
    isSending,
    error,
    loadChatHistory,
    sendMessage,
  } = useChatStore();

  const [messageInput, setMessageInput] = useState("");
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Load chat history on mount
    loadChatHistory(applicationId);
  }, [applicationId]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (currentConversation && currentConversation.messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [currentConversation?.messages]);

  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;

    const message = messageInput;
    setMessageInput("");

    await sendMessage(
      message,
      applicationId,
      currentConversation?.messages || []
    );
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isUser = item.role === "user";

    return (
      <View
        style={{
          flexDirection: "row",
          justifyContent: isUser ? "flex-end" : "flex-start",
          marginBottom: colors.spacing[12],
          paddingHorizontal: colors.spacing[16],
        }}
      >
        <View
          style={{
            maxWidth: "80%",
            backgroundColor: isUser ? colors.black : colors.gray[100],
            borderRadius: colors.radius[12],
            paddingHorizontal: colors.spacing[12],
            paddingVertical: colors.spacing[10],
          }}
        >
          <Text
            style={{
              fontSize: colors.typography.sizes.sm,
              color: isUser ? colors.white : colors.black,
              lineHeight: colors.typography.lineHeights[1.5],
            }}
          >
            {item.content}
          </Text>

          {item.sources && item.sources.length > 0 && (
            <View style={{ marginTop: colors.spacing[8] }}>
              <Text
                style={{
                  fontSize: colors.typography.sizes.xs,
                  color: isUser ? colors.gray[200] : colors.gray[600],
                  fontStyle: "italic",
                }}
              >
                Sources: {item.sources.join(", ")}
              </Text>
            </View>
          )}

          <Text
            style={{
              fontSize: colors.typography.sizes.xs,
              color: isUser ? colors.gray[300] : colors.gray[500],
              marginTop: colors.spacing[4],
            }}
          >
            {new Date(item.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
      </View>
    );
  };

  const messages = currentConversation?.messages || [];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: colors.white }}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: colors.white,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        }}
      >
        {/* Header */}
        <View
          style={{
            backgroundColor: colors.black,
            paddingVertical: colors.spacing[16],
            paddingHorizontal: colors.spacing[20],
          }}
        >
          <Text
            style={{
              fontSize: colors.typography.sizes.lg,
              fontWeight: colors.typography.weights.bold as any,
              color: colors.white,
            }}
          >
            AI Assistant
          </Text>
          <Text
            style={{
              fontSize: colors.typography.sizes.xs,
              color: colors.gray[300],
              marginTop: colors.spacing[4],
            }}
          >
            Get help with your visa application
          </Text>
        </View>

        {/* Error Message */}
        {error && (
          <View
            style={{
              backgroundColor: colors.error[50],
              borderBottomWidth: 1,
              borderBottomColor: colors.error[200],
              padding: colors.spacing[12],
            }}
          >
            <Text
              style={{
                fontSize: colors.typography.sizes.sm,
                color: colors.error[700],
              }}
            >
              {error}
            </Text>
          </View>
        )}

        {/* Messages List */}
        {messages.length === 0 ? (
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              paddingHorizontal: colors.spacing[20],
            }}
          >
            <Text
              style={{
                fontSize: colors.typography.sizes.base,
                color: colors.gray[600],
                textAlign: "center",
                marginBottom: colors.spacing[12],
              }}
            >
              Start a conversation
            </Text>
            <Text
              style={{
                fontSize: colors.typography.sizes.sm,
                color: colors.gray[500],
                textAlign: "center",
              }}
            >
              Ask me anything about your visa application or the visa process
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            onEndReachedThreshold={0.5}
            scrollEnabled={true}
            contentContainerStyle={{ paddingTop: colors.spacing[12] }}
          />
        )}

        {/* Input Area */}
        <View
          style={{
            backgroundColor: colors.gray[50],
            borderTopWidth: 1,
            borderTopColor: colors.gray[200],
            paddingHorizontal: colors.spacing[12],
            paddingVertical: colors.spacing[12],
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-end",
              gap: colors.spacing[8],
            }}
          >
            <TextInput
              style={{
                flex: 1,
                backgroundColor: colors.white,
                borderWidth: 1,
                borderColor: colors.gray[300],
                borderRadius: colors.radius[6],
                paddingHorizontal: colors.spacing[12],
                paddingVertical: colors.spacing[10],
                fontSize: colors.typography.sizes.sm,
                color: colors.black,
                maxHeight: 100,
              }}
              placeholder="Type your question..."
              placeholderTextColor={colors.gray[400]}
              value={messageInput}
              onChangeText={setMessageInput}
              multiline
              editable={!isSending}
            />

            <TouchableOpacity
              onPress={handleSendMessage}
              disabled={isSending || !messageInput.trim()}
              style={{
                backgroundColor:
                  isSending || !messageInput.trim()
                    ? colors.gray[300]
                    : colors.black,
                width: 40,
                height: 40,
                borderRadius: colors.radius[6],
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {isSending ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={{ fontSize: 18, color: colors.white }}>→</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Help Text */}
          <Text
            style={{
              fontSize: colors.typography.sizes.xs,
              color: colors.gray[500],
              marginTop: colors.spacing[8],
              marginLeft: colors.spacing[4],
            }}
          >
            {messages.length === 0
              ? "Your messages are saved automatically"
              : `${messages.length} messages in this conversation`}
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};