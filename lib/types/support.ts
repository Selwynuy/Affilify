export type TicketCategory = 'billing' | 'technical' | 'general' | 'feature_request'
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface SupportTicket {
  id: string
  user_id: string
  subject: string
  category: TicketCategory
  status: TicketStatus
  priority: TicketPriority
  created_at: string
  updated_at: string
  // joined
  message_count?: number
  last_message_at?: string
}

export interface TicketMessage {
  id: string
  ticket_id: string
  sender_id: string
  is_staff: boolean
  body: string
  attachment_url: string | null
  attachment_name: string | null
  created_at: string
}

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  billing: 'Billing',
  technical: 'Technical',
  general: 'General Inquiry',
  feature_request: 'Feature Request',
}

export const STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
}

export const STATUS_COLORS: Record<TicketStatus, string> = {
  open: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  in_progress: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  resolved: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  closed: 'text-white/30 bg-white/5 border-white/10',
}
