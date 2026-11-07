// Warshati — props reference for the restyled components. Components that show words take lang: 'en' | 'fr' | 'ar' (default 'en').
type Lang = 'en' | 'fr' | 'ar';
export interface IconProps { name: string; size?: number; label?: string }
export interface ButtonProps { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'flux'; size?: 'sm' | 'md' | 'lg'; icon?: string; iconOnly?: boolean; label?: string; loading?: boolean; block?: boolean; disabled?: boolean; onClick?: () => void; children?: any }
export interface InputProps { label?: string; required?: boolean; value?: string; placeholder?: string; leftIcon?: string; rightIcon?: string; error?: string; help?: string; mono?: boolean; center?: boolean; multiline?: boolean; rows?: number; readOnly?: boolean; dir?: 'ltr' | 'rtl'; type?: string }
export interface FieldProps { label?: string; required?: boolean; error?: string; help?: string; children: any }
export interface SelectProps { label?: string; value?: string; options: string[] }
export interface CheckboxProps { label: string; checked?: boolean }
export interface MoneyInputProps { label?: string; value?: number; placeholder?: number; lang?: Lang }
export interface ComboboxProps { value?: string; placeholder?: string; open?: boolean; query?: string; highlight?: number; items?: { label: string; sub?: string; count?: string; badge?: string; photo?: boolean; manual?: boolean }[] }
export interface SegmentedSwitchProps { options: { value: string; label: string; icon?: string }[]; value?: string; block?: boolean; vertical?: boolean }
export interface TabsProps { tabs: { value: string; label: string; icon?: string; count?: number }[]; value?: string }
export interface BadgeProps { variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'; dot?: boolean; icon?: string; children?: any }
export interface StatusBadgeProps { kind: 'ticket' | 'priority' | 'debt' | 'payment' | 'po' | 'sale' | 'condition' | 'tradein' | 'checkin' | 'warranty' | 'followup' | 'stock' | 'user' | 'vfm'; value: string; lang?: Lang }
export interface VfmBadgeProps { value: 'performance-beast' | 'value-king' | 'average' | 'overpriced'; score?: number; lang?: Lang }
export interface MoneyProps { value: number; lang?: Lang; strong?: boolean }
export interface AlertProps { tone?: 'error' | 'warning' | 'success' | 'info'; title?: string; icon?: string; action?: any; children?: any }
export interface ToastProps { tone?: 'success' | 'error' | 'warning' | 'info'; children?: any }
export interface ModalProps { size?: 'sm' | 'md' | 'lg' | 'xl'; title: string; footer?: any; children?: any }
export interface ConfirmModalProps { title?: string; message?: string; confirmText?: string; cancelText?: string; danger?: boolean }
export interface ModalStackProps { height?: number; behind?: any; children: any }
export interface CardProps { title?: string; icon?: string; actions?: any; flush?: boolean; children?: any }
export interface PageHeaderProps { title: any; subtitle?: any; badges?: any; back?: boolean; actions?: any }
export interface StatCardProps { label: string; value: any; sub?: string; subTone?: 'success' | 'warning' | 'destructive'; icon?: string; tone?: 'key'; negative?: boolean }
export interface TableProps { columns: { label: string; end?: boolean; width?: number }[]; rows: any[][]; selected?: number; clickable?: boolean; empty?: any }
export interface EmptyStateProps { icon?: string; title: string; text?: string }
export interface DevicePickerProps { lang?: Lang; category?: 'phone' | 'laptop' | 'console'; brand?: string; model?: string; manual?: boolean; picked?: boolean; openList?: 'brand' | 'model'; query?: string; brandItems?: ComboboxProps['items']; modelItems?: ComboboxProps['items'] }
export interface PosPaymentProps { total: number; subtotal?: number; discount?: number; tradeIn?: number; method?: 'cash' | 'credit' | 'split'; paid?: number; customer?: string; lang?: Lang }
export interface PaymentHistoryProps { payments: { date: string; amount: number; note?: string; cancelled?: boolean; cancelling?: boolean }[]; owner?: boolean; receipts?: boolean; lang?: Lang }
export interface WhatsAppButtonProps { size?: 'sm' | 'md' | 'lg'; iconOnly?: boolean; label?: string; children?: any }
export interface SidebarProps { lang?: Lang; role?: 'owner' | 'staff'; active?: string; logo?: string; collapsed?: boolean }
export interface HeaderProps { crumbs?: string[]; user?: string; update?: string }
export interface AppShellProps extends SidebarProps, HeaderProps { toast?: any; overlay?: any; pageStyle?: object; children?: any }
export interface ReceiptProps { paper?: 80 | 58; lang?: Lang; children?: any }
export interface A4ReportProps { lang?: Lang; children?: any }
