"use client";

import { useSyncExternalStore } from "react";

/* Global UI state: toasts, the generic form modal and the confirm dialog. */

export type ToastKind = "ok" | "err" | "info";
export interface Toast {
  id: number;
  msg: string;
  kind: ToastKind;
}

export type FieldOption = string | [value: string, label: string];
export interface FormField {
  key: string;
  label: string;
  type?: "text" | "email" | "number" | "date" | "select" | "textarea";
  required?: boolean;
  placeholder?: string;
  options?: FieldOption[];
  /** Span both columns */
  full?: boolean;
}
export type FormValues = Record<string, string>;
export interface FormConfig {
  title: string;
  desc?: string;
  fields: FormField[];
  values: FormValues;
  submit?: string;
  danger?: boolean;
  /** Extra checks after the required-field check; return field → message */
  validate?: (v: FormValues) => Record<string, string | undefined>;
  onSubmit: (v: FormValues) => void | Promise<void>;
}

export interface ConfirmConfig {
  title: string;
  msg: string;
  ok?: string;
  danger?: boolean;
  onOk: () => void | Promise<void>;
}

interface UiState {
  toasts: Toast[];
  form: FormConfig | null;
  confirm: ConfirmConfig | null;
}

let state: UiState = { toasts: [], form: null, confirm: null };
const listeners = new Set<() => void>();
const set = (patch: Partial<UiState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const SERVER: UiState = { toasts: [], form: null, confirm: null };

export const useUi = () => useSyncExternalStore(subscribe, () => state, () => SERVER);

let seq = 0;
export function toast(msg: string, kind: ToastKind = "ok") {
  const id = ++seq;
  set({ toasts: [...state.toasts, { id, msg, kind }] });
  setTimeout(() => dismissToast(id), 3400);
}
export const dismissToast = (id: number) =>
  set({ toasts: state.toasts.filter((t) => t.id !== id) });

export const openForm = (form: FormConfig) => set({ form });
export const closeForm = () => set({ form: null });
export const confirmAction = (confirm: ConfirmConfig) => set({ confirm });
export const closeConfirm = () => set({ confirm: null });
export const closeOverlays = () => set({ form: null, confirm: null });
