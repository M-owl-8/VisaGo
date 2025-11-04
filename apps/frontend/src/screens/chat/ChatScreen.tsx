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
import { apiClient } from "../../services/api";

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

  const [showQuickActions, setShowQuickActions] = React.useState(true);
  const [feedbackLoading, setFeedbackLoading] = React.useState<string | null>(null);
  const [messageFeedback, setMessageFeedback] = React.useState<{
    [messageId: string]: string;
  }>({});

  const handleQuickAction = async (action: string) => {
    const quickMessages: { [key: string]: string } = {
      documents: "What documents do I need to upload for my application?",
      timeline: "What's the expected processing timeline for my visa?",
      requirements: "What are the financial requirements for my application?",
      mistakes: "What are common mistakes applicants make?",
      embassy: "How can I contact the embassy?",
      update: "What's the status of my application?",
    };

    if (quickMessages[action]) {
      setMessageInput(quickMessages[action]);
      setTimeout(() => handleSendMessage(), 100);
      setShowQuickActions(false);
    }
  };

  const handleMessageFeedback = async (
    messageId: string,
    feedback: "thumbs_up" | "thumbs_down"
  ) => {
    try {
      setFeedbackLoading(messageId);
      await apiClient.addMessageFeedback(messageId, feedback);
      setMessageFeedback((prev) => ({
        ...prev,
        [messageId]: feedback,
      }));
    } catch (error) {
      console.error("Failed to send feedback:", error);
    } finally {
      setFeedbackLoading(null);
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isUser = item.role === "user";

    return (
      <View
        style={{
          marginBottom: colors.spacing[12],
          paddingHorizontal: colors.spacing[16],
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: isUser ? "flex-end" : "flex-start",
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
                  📚 Sources: {item.sources.join(", ")}
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

        {/* Feedback buttons for assistant messages */}
        {!isUser && (
          <View
            style={{
              flexDirection: "row",
              gap: colors.spacing[8],
              marginTop: colors.spacing[8],
              marginLeft: isUser ? "auto" : colors.spacing[0],
              marginRight: isUser ? colors.spacing[0] : "auto",
            }}
          >
            <TouchableOpacity
              onPress={() => handleMessageFeedback(item.id, "thumbs_up")}
              disabled={feedbackLoading === item.id}
              style={{
                paddingVertical: colors.spacing[6],
                paddingHorizontal: colors.spacing[10],
                borderRadius: colors.radius[4],
                backgroundColor:
                  messageFeedback[item.id] === "thumbs_up"
                    ? colors.gray[300]
                    : colors.white,
                borderWidth: 1,
                borderColor: colors.gray[300],
              }}
            >
              <Text style={{ fontSize: 14 }}>👍</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleMessageFeedback(item.id, "thumbs_down")}
              disabled={feedbackLoading === item.id}
              style={{
                paddingVertical: colors.spacing[6],
                paddingHorizontal: colors.spacing[10],
                borderRadius: colors.radius[4],
                backgroundColor:
                  messageFeedback[item.id] === "thumbs_down"
                    ? colors.gray[300]
                    : colors.white,
                borderWidth: 1,
                borderColor: colors.gray[300],
              }}
            >
              <Text style={{ fontSize: 14 }}>👎</Text>
            </TouchableOpacity>
          </View>
        )}
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
                fontSize: colors.typography.sizes.lg,
                fontWeight: "600",
                color: colors.black,
                textAlign: "center",
                marginBottom: colors.spacing[8],
              }}
            >
              🤖 AI Visa Assistant
            </Text>
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

            {/* Quick Action Buttons */}
            {showQuickActions && (
              <View
                style={{
                  marginTop: colors.spacing[24],
                  width: "100%",
                  gap: colors.spacing[12],
                }}
              >
                <TouchableOpacity
                  onPress={() => handleQuickAction("documents")}
                  style={{
                    backgroundColor: colors.gray[100],
                    paddingVertical: colors.spacing[12],
                    paddingHorizontal: colors.spacing[16],
                    borderRadius: colors.radius[8],
                    borderLeftWidth: 3,
                    borderLeftColor: colors.black,
                  }}
                >
                  <Text
                    style={{
                      fontSize: colors.typography.sizes.sm,
                      color: colors.black,
                      fontWeight: "500",
                    }}
                  >
                    📄 What documents do I need?
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleQuickAction("timeline")}
                  style={{
                    backgroundColor: colors.gray[100],
                    paddingVertical: colors.spacing[12],
                    paddingHorizontal: colors.spacing[16],
                    borderRadius: colors.radius[8],
                    borderLeftWidth: 3,
                    borderLeftColor: colors.black,
                  }}
                >
                  <Text
                    style={{
                      fontSize: colors.typography.sizes.sm,
                      color: colors.black,
                      fontWeight: "500",
                    }}
                  >
                    ⏱️ What's the processing time?
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleQuickAction("requirements")}
                  style={{
                    backgroundColor: colors.gray[100],
                    paddingVertical: colors.spacing[12],
                    paddingHorizontal: colors.spacing[16],
                    borderRadius: colors.radius[8],
                    borderLeftWidth: 3,
                    borderLeftColor: colors.black,
                  }}
                >
                  <Text
                    style={{
                      fontSize: colors.typography.sizes.sm,
                      color: colors.black,
                      fontWeight: "500",
                    }}
                  >
                    💰 What are the financial requirements?
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleQuickAction("mistakes")}
                  style={{
                    backgroundColor: colors.gray[100],
                    paddingVertical: colors.spacing[12],
                    paddingHorizontal: colors.spacing[16],
                    borderRadius: colors.radius[8],
                    borderLeftWidth: 3,
                    borderLeftColor: colors.black,
                  }}
                >
                  <Text
                    style={{
                      fontSize: colors.typography.sizes.sm,
                      color: colors.black,
                      fontWeight: "500",
                    }}
                  >
                    ⚠️ What mistakes should I avoid?
                  </Text>
                </TouchableOpacity>
              </View>
            )}
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