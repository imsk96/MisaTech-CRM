/**
 * Approval Engine Module
 * Handles approval workflow for staff actions
 */

import { APPROVAL_STATUS, ACTION_TYPES } from '../utils/constants.js';
import { toast, safeJsonStringify } from '../utils/helpers.js';
import authManager from '../lib/auth.js';
import syncEngine from './sync.js';

class ApprovalEngine {
  constructor() {
    this.supabase = null;
  }

  /**
   * Initialize with Supabase client
   */
  init(supabaseClient) {
    this.supabase = supabaseClient;
    return this;
  }

  /**
   * Submit action for approval (used by staff)
   */
  async submitForApproval(moduleName, actionType, payload) {
    try {
      const user = await authManager.getCurrentUser();
      const companyId = authManager.getCompanyId();

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Validate action type
      if (!Object.values(ACTION_TYPES).includes(actionType)) {
        throw new Error(`Invalid action type: ${actionType}`);
      }

      // Create approval record
      const approvalData = {
        company_id: companyId,
        module_name: moduleName,
        action_type: actionType,
        payload: safeJsonStringify(payload),
        status: APPROVAL_STATUS.PENDING,
        created_by: user.id,
        created_at: new Date().toISOString(),
        synced: false
      };

      const result = await this.supabase.from('approvals').insert(approvalData);
      
      const approvalId = result[0]?.id || `approval_${Date.now()}`;

      toast.success('Action submitted for approval');
      return { success: true, approvalId };

    } catch (error) {
      console.error('Submit for approval error:', error);
      toast.error(`Failed to submit for approval: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get pending approvals for admin review
   */
  async getPendingApprovals() {
    try {
      const companyId = authManager.getCompanyId();

      const approvals = await this.supabase
        .from('approvals')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', APPROVAL_STATUS.PENDING)
        .order('created_at', { ascending: false });

      return approvals || [];

    } catch (error) {
      console.error('Get pending approvals error:', error);
      return [];
    }
  }

  /**
   * Get all approvals (for history)
   */
  async getAllApprovals(limit = 50) {
    try {
      const companyId = authManager.getCompanyId();

      const approvals = await this.supabase
        .from('approvals')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(limit);

      return approvals || [];

    } catch (error) {
      console.error('Get all approvals error:', error);
      return [];
    }
  }

  /**
   * Approve an action (admin only)
   */
  async approve(approvalId) {
    try {
      // Verify admin role
      if (!authManager.isAdmin()) {
        throw new Error('Admin privileges required');
      }

      // Update approval status
      await this.supabase
        .from('approvals')
        .update({
          status: APPROVAL_STATUS.APPROVED,
          approved_by: (await authManager.getCurrentUser()).id,
          approved_at: new Date().toISOString()
        })
        .eq('id', approvalId);

      // Trigger sync engine to execute the action
      syncEngine.addToQueue(approvalId);

      toast.success('Approval granted. Syncing to external storage...');
      return { success: true };

    } catch (error) {
      console.error('Approve error:', error);
      toast.error(`Failed to approve: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Reject an action (admin only)
   */
  async reject(approvalId, reason = '') {
    try {
      // Verify admin role
      if (!authManager.isAdmin()) {
        throw new Error('Admin privileges required');
      }

      // Update approval status
      await this.supabase
        .from('approvals')
        .update({
          status: APPROVAL_STATUS.REJECTED,
          rejected_by: (await authManager.getCurrentUser()).id,
          rejected_at: new Date().toISOString(),
          rejection_reason: reason
        })
        .eq('id', approvalId);

      toast.info('Action rejected');
      return { success: true };

    } catch (error) {
      console.error('Reject error:', error);
      toast.error(`Failed to reject: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Bulk approve multiple actions
   */
  async bulkApprove(approvalIds) {
    try {
      if (!authManager.isAdmin()) {
        throw new Error('Admin privileges required');
      }

      const results = [];
      for (const id of approvalIds) {
        const result = await this.approve(id);
        results.push({ id, ...result });
      }

      toast.success(`Approved ${results.filter(r => r.success).length} actions`);
      return results;

    } catch (error) {
      console.error('Bulk approve error:', error);
      toast.error(`Bulk approve failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Bulk reject multiple actions
   */
  async bulkReject(approvalIds, reason = '') {
    try {
      if (!authManager.isAdmin()) {
        throw new Error('Admin privileges required');
      }

      const results = [];
      for (const id of approvalIds) {
        const result = await this.reject(id, reason);
        results.push({ id, ...result });
      }

      toast.info(`Rejected ${results.filter(r => r.success).length} actions`);
      return results;

    } catch (error) {
      console.error('Bulk reject error:', error);
      toast.error(`Bulk reject failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Get approval statistics
   */
  async getStats() {
    try {
      const companyId = authManager.getCompanyId();
      const allApprovals = await this.getAllApprovals(1000);

      const stats = {
        total: allApprovals.length,
        pending: allApprovals.filter(a => a.status === APPROVAL_STATUS.PENDING).length,
        approved: allApprovals.filter(a => a.status === APPROVAL_STATUS.APPROVED).length,
        rejected: allApprovals.filter(a => a.status === APPROVAL_STATUS.REJECTED).length,
        synced: allApprovals.filter(a => a.synced).length
      };

      // By module
      stats.byModule = {};
      allApprovals.forEach(a => {
        if (!stats.byModule[a.module_name]) {
          stats.byModule[a.module_name] = { pending: 0, approved: 0, rejected: 0 };
        }
        stats.byModule[a.module_name][a.status]++;
      });

      // By action type
      stats.byActionType = {};
      allApprovals.forEach(a => {
        if (!stats.byActionType[a.action_type]) {
          stats.byActionType[a.action_type] = 0;
        }
        stats.byActionType[a.action_type]++;
      });

      return stats;

    } catch (error) {
      console.error('Get stats error:', error);
      return { total: 0, pending: 0, approved: 0, rejected: 0, synced: 0 };
    }
  }

  /**
   * Get single approval details
   */
  async getApproval(approvalId) {
    try {
      const approvals = await this.supabase
        .from('approvals')
        .select('*')
        .eq('id', approvalId)
        .single();

      return Array.isArray(approvals) ? approvals[0] : approvals;

    } catch (error) {
      console.error('Get approval error:', error);
      return null;
    }
  }

  /**
   * Cancel a pending approval (only by creator or admin)
   */
  async cancel(approvalId) {
    try {
      const user = await authManager.getCurrentUser();
      const approval = await this.getApproval(approvalId);

      if (!approval) {
        throw new Error('Approval not found');
      }

      // Check if user is creator or admin
      if (approval.created_by !== user.id && !authManager.isAdmin()) {
        throw new Error('Unauthorized to cancel this approval');
      }

      if (approval.status !== APPROVAL_STATUS.PENDING) {
        throw new Error('Can only cancel pending approvals');
      }

      await this.supabase
        .from('approvals')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        })
        .eq('id', approvalId);

      toast.info('Approval cancelled');
      return { success: true };

    } catch (error) {
      console.error('Cancel error:', error);
      toast.error(`Failed to cancel: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export const approvalEngine = new ApprovalEngine();
export default approvalEngine;
