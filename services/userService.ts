/**
 * Alias matching the HO User Management deliverable naming (`userService`).
 * Prefer importing from `./userManagementApi` in new code.
 */
export {
  getUsers,
  getUser,
  createUser,
  updateUser,
  assignProjects,
  changePassword,
  resetPassword,
  updateUserStatus,
  deleteUser,
} from './userManagementApi';
