import { Children, cloneElement, isValidElement } from 'react';

const LABELABLE_ELEMENTS = new Set(['input', 'select', 'textarea']);

export function linkLabelToControl(children, fallbackId, componentTypes = []) {
  let controlId = '';

  function visit(node) {
    if (Array.isArray(node)) return Children.map(node, visit);
    if (!isValidElement(node) || controlId) return node;

    const isNativeControl = typeof node.type === 'string' && LABELABLE_ELEMENTS.has(node.type);
    if (isNativeControl || componentTypes.includes(node.type)) {
      controlId = node.props.id || fallbackId;
      return node.props.id ? node : cloneElement(node, { id: controlId });
    }

    if (node.props.children == null) return node;
    return cloneElement(node, undefined, visit(node.props.children));
  }

  const control = visit(children);
  return { id: controlId || fallbackId, control };
}

export function areaFilterOptions(devices) {
  const refs = [...new Set(devices
    .map(device => device.areaRef?.trim())
    .filter(Boolean))];
  return refs.map(areaRef => ({ value: areaRef, label: areaRef }));
}

export function passwordChangeAvailable(source) {
  return source === 'local';
}

export function developerDataEnabled(source) {
  return source === 'api';
}

export function claimedDeviceState(role, devices, code) {
  if (role === 'pengelola') return { state: 'claimed', deviceId: '' };

  const device = devices.find(item => item.code?.toUpperCase() === code.toUpperCase());
  return device
    ? { state: 'own', deviceId: device.id }
    : { state: 'other', deviceId: '' };
}
