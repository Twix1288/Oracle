import { OracleRequest, UserRole } from './types.ts';
import { OracleError } from './config.ts';

// Validate Oracle request
export function validateOracleRequest(request: OracleRequest): void {
  // Required fields
  if (!request.query?.trim()) {
    throw new OracleError(
      'Query is required',
      'invalid_request',
      400,
      { field: 'query' }
    );
  }

  if (!request.role) {
    throw new OracleError(
      'Role is required',
      'invalid_request',
      400,
      { field: 'role' }
    );
  }

  // Role validation
  const validRoles: UserRole[] = ['builder', 'mentor', 'lead', 'guest'];
  if (!validRoles.includes(request.role)) {
    throw new OracleError(
      'Invalid role',
      'invalid_request',
      400,
      { field: 'role', validValues: validRoles }
    );
  }

  // Query length
  if (request.query.length > 1000) {
    throw new OracleError(
      'Query too long (max 1000 characters)',
      'invalid_request',
      400,
      { field: 'query', maxLength: 1000 }
    );
  }

  // Context request validation
  if (request.contextRequest) {
    const { needsResources, needsMentions, needsTeamContext, needsPersonalization, resourceTopic } = request.contextRequest;

    // If resourceTopic is provided, needsResources should be true
    if (resourceTopic && !needsResources) {
      throw new OracleError(
        'Resource topic provided but needsResources is false',
        'invalid_request',
        400,
        { field: 'contextRequest' }
      );
    }

    // If any context flags are true, validate related fields
    if (needsTeamContext && !request.teamId) {
      throw new OracleError(
        'Team context requested but no teamId provided',
        'invalid_request',
        400,
        { field: 'teamId' }
      );
    }

    if (needsPersonalization && !request.userProfile) {
      throw new OracleError(
        'Personalization requested but no user profile provided',
        'invalid_request',
        400,
        { field: 'userProfile' }
      );
    }
  }

  // Command validation
  if (request.commandExecuted) {
    if (!request.commandType) {
      throw new OracleError(
        'Command type required when commandExecuted is true',
        'invalid_request',
        400,
        { field: 'commandType' }
      );
    }

    if (!request.commandResult) {
      throw new OracleError(
        'Command result required when commandExecuted is true',
        'invalid_request',
        400,
        { field: 'commandResult' }
      );
    }
  }

  // User profile validation
  if (request.userProfile) {
    const requiredFields = ['id', 'name', 'role'];
    const missingFields = requiredFields.filter(field => !request.userProfile[field]);
    
    if (missingFields.length > 0) {
      throw new OracleError(
        'Invalid user profile',
        'invalid_request',
        400,
        { field: 'userProfile', missingFields }
      );
    }

    // Validate role in user profile
    if (!validRoles.includes(request.userProfile.role)) {
      throw new OracleError(
        'Invalid role in user profile',
        'invalid_request',
        400,
        { field: 'userProfile.role', validValues: validRoles }
      );
    }
  }
}

// Validate team ID format
export function validateTeamId(teamId: string): void {
  // UUID format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(teamId)) {
    throw new OracleError(
      'Invalid team ID format',
      'invalid_request',
      400,
      { field: 'teamId', expectedFormat: 'UUID' }
    );
  }
}

// Validate user ID format
export function validateUserId(userId: string): void {
  // UUID format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    throw new OracleError(
      'Invalid user ID format',
      'invalid_request',
      400,
      { field: 'userId', expectedFormat: 'UUID' }
    );
  }
}

// Validate broadcast message
export function validateBroadcastMessage(message: string, type: string, target?: string): void {
  if (!message?.trim()) {
    throw new OracleError(
      'Broadcast message is required',
      'invalid_request',
      400,
      { field: 'message' }
    );
  }

  if (message.length > 2000) {
    throw new OracleError(
      'Broadcast message too long (max 2000 characters)',
      'invalid_request',
      400,
      { field: 'message', maxLength: 2000 }
    );
  }

  const validTypes = ['all', 'team', 'role'];
  if (!validTypes.includes(type)) {
    throw new OracleError(
      'Invalid broadcast type',
      'invalid_request',
      400,
      { field: 'type', validValues: validTypes }
    );
  }

  if ((type === 'team' || type === 'role') && !target?.trim()) {
    throw new OracleError(
      'Target required for team or role broadcasts',
      'invalid_request',
      400,
      { field: 'target' }
    );
  }
}

// Validate update content
export function validateUpdateContent(content: string): void {
  if (!content?.trim()) {
    throw new OracleError(
      'Update content is required',
      'invalid_request',
      400,
      { field: 'content' }
    );
  }

  if (content.length > 5000) {
    throw new OracleError(
      'Update content too long (max 5000 characters)',
      'invalid_request',
      400,
      { field: 'content', maxLength: 5000 }
    );
  }
}

// Validate status update
export function validateStatusUpdate(status: string): void {
  if (!status?.trim()) {
    throw new OracleError(
      'Status text is required',
      'invalid_request',
      400,
      { field: 'status' }
    );
  }

  if (status.length > 500) {
    throw new OracleError(
      'Status text too long (max 500 characters)',
      'invalid_request',
      400,
      { field: 'status', maxLength: 500 }
    );
  }
}
