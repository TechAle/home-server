import type {ComputerInfo, SystemResourceInfo} from '../types/api';
import {request} from './client';

export function fetchComputerInfo(): Promise<ComputerInfo> {
  return request<ComputerInfo>('/get_computer_info');
}

export function fetchSystemResources(): Promise<SystemResourceInfo> {
  return request<SystemResourceInfo>('/get_system_resource_info');
}
