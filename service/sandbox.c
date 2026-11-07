#define _GNU_SOURCE
#include <errno.h>
#include <fcntl.h>
#include <linux/landlock.h>
#include <seccomp.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/prctl.h>
#include <sys/resource.h>
#include <sys/stat.h>
#include <sys/syscall.h>
#include <unistd.h>

/* Apply restrictions to Arduino CLI and every compiler child. Fail closed. */
static void fail(const char *message) { perror(message); exit(126); }
static void allow_path(int rules, const char *path, uint64_t access, int optional) {
  int fd = open(path, O_PATH | O_CLOEXEC);
  if (fd < 0) { if (optional && errno == ENOENT) return; fail("sandbox path"); }
  struct stat info;
  if (fstat(fd, &info)) fail("sandbox stat");
  if (!S_ISDIR(info.st_mode)) access &= LANDLOCK_ACCESS_FS_READ_FILE | LANDLOCK_ACCESS_FS_WRITE_FILE | LANDLOCK_ACCESS_FS_EXECUTE | LANDLOCK_ACCESS_FS_TRUNCATE;
  struct landlock_path_beneath_attr rule = { .parent_fd = fd, .allowed_access = access };
  if (syscall(SYS_landlock_add_rule, rules, LANDLOCK_RULE_PATH_BENEATH, &rule, 0)) fail("sandbox rule");
  close(fd);
}
int main(int argc, char **argv) {
  int abi = syscall(SYS_landlock_create_ruleset, NULL, 0, LANDLOCK_CREATE_RULESET_VERSION);
  if (abi < 3) { fprintf(stderr, "Compiler sandbox requires Linux Landlock ABI 3 or newer.\n"); return 126; }
  const uint64_t all = (1ULL << 15) - 1;
  const uint64_t read = LANDLOCK_ACCESS_FS_READ_FILE | LANDLOCK_ACCESS_FS_READ_DIR | LANDLOCK_ACCESS_FS_EXECUTE;
  struct landlock_ruleset_attr attr = { .handled_access_fs = all };
  int rules = syscall(SYS_landlock_create_ruleset, &attr, sizeof(attr), 0);
  if (rules < 0) fail("sandbox create");
  const char *paths[] = { "/usr", "/lib", "/lib64", "/home/node/.arduino15", "/home/node/Arduino", "/etc/ld.so.cache", "/etc/passwd", "/etc/group", "/dev/urandom", "/dev/random" };
  for (size_t i = 0; i < sizeof(paths) / sizeof(paths[0]); i++) allow_path(rules, paths[i], read, 1);
  allow_path(rules, "/dev/null", LANDLOCK_ACCESS_FS_READ_FILE | LANDLOCK_ACCESS_FS_WRITE_FILE, 0);
  const char *root = getenv("CRAB_SANDBOX_ROOT");
  if (root) {
    if (strncmp(root, "/tmp/crab-", 10) || strstr(root + 10, "/") || strstr(root, "..")) { fprintf(stderr, "Invalid compiler sandbox directory.\n"); return 126; }
    /* No execution permission in the student build directory. */
    allow_path(rules, root, all & ~LANDLOCK_ACCESS_FS_EXECUTE, 0);
    if (chdir(root)) fail("sandbox cwd");
    setenv("HOME", root, 1);
    setenv("TMPDIR", root, 1);
    setenv("XDG_CACHE_HOME", root, 1);
    setenv("ARDUINO_BUILD_CACHE_PATH", root, 1);
  } else {
    if (argc != 2 || strcmp(argv[1], "version")) { fprintf(stderr, "Compiler sandbox needs a build directory.\n"); return 126; }
    if (chdir("/usr/local/bin")) fail("sandbox cwd");
    setenv("HOME", "/nonexistent", 1);
  }
  setenv("ARDUINO_DIRECTORIES_DATA", "/home/node/.arduino15", 1);
  setenv("ARDUINO_DIRECTORIES_USER", "/home/node/Arduino", 1);
  setenv("ARDUINO_UPDATER_ENABLE_NOTIFICATION", "false", 1);
  if (prctl(PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0)) fail("sandbox privileges");
  if (syscall(SYS_landlock_restrict_self, rules, 0)) fail("sandbox restrict");
  close(rules);
  scmp_filter_ctx filter = seccomp_init(SCMP_ACT_ALLOW);
  if (!filter) fail("sandbox seccomp");
  const char *denied[] = { "socket", "socketpair", "connect", "bind", "listen", "accept", "accept4", "sendto", "sendmsg", "ptrace", "process_vm_readv", "process_vm_writev", "pidfd_getfd", "mount", "umount2", "unshare", "setns", "bpf", "keyctl", "open_by_handle_at" };
  for (size_t i = 0; i < sizeof(denied) / sizeof(denied[0]); i++) {
    int number = seccomp_syscall_resolve_name(denied[i]);
    if (number != __NR_SCMP_ERROR && seccomp_rule_add(filter, SCMP_ACT_ERRNO(EPERM), number, 0)) fail("sandbox syscall rule");
  }
  if (seccomp_load(filter)) fail("sandbox syscall filter");
  seccomp_release(filter);
  struct rlimit size = { 128UL * 1024 * 1024, 128UL * 1024 * 1024 };
  struct rlimit cpu = { 40, 40 };
  struct rlimit core = { 0, 0 };
  if (setrlimit(RLIMIT_FSIZE, &size) || setrlimit(RLIMIT_CPU, &cpu) || setrlimit(RLIMIT_CORE, &core)) fail("sandbox limits");
  argv[0] = "/usr/local/bin/arduino-cli";
  execv(argv[0], argv);
  fail("sandbox Arduino CLI");
}
