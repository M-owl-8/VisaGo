/**
 * Format a timestamp to relative time (e.g., "2 hours ago", "Yesterday")
 */
export function formatRelativeTime(timestamp: string | Date): string {
  const now = new Date();
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) {
    return 'Just now';
  }
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  
  const days = Math.floor(hours / 24);
  if (days === 1) {
    return 'Yesterday';
  }
  
  if (days < 7) {
    return `${days} days ago`;
  }
  
  const weeks = Math.floor(days / 7);
  if (weeks < 4) {
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  }
  
  // For older dates, show the actual date
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}

/**
 * Format timestamp for message metadata
 */
export function formatMessageTime(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
}

