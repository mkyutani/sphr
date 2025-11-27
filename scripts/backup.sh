#!/bin/sh
#
# PostgreSQL Backup Script
# Performs daily full backup at 3:00 AM and retains backups for 30 days
#

set -e

# Configuration
BACKUP_DIR="/backups"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/sphr_db_${TIMESTAMP}.sql.gz"
LOG_FILE="${BACKUP_DIR}/backup.log"

# Ensure backup directory exists
mkdir -p "${BACKUP_DIR}"

# Log function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

# Backup function
perform_backup() {
    log "Starting backup: ${BACKUP_FILE}"

    # Perform backup
    if pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" | gzip > "${BACKUP_FILE}"; then
        log "Backup completed successfully: ${BACKUP_FILE}"

        # Get backup size
        BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
        log "Backup size: ${BACKUP_SIZE}"

        return 0
    else
        log "ERROR: Backup failed"
        return 1
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up backups older than ${RETENTION_DAYS} days"

    # Find and delete old backups
    DELETED_COUNT=$(find "${BACKUP_DIR}" -name "sphr_db_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete -print | wc -l)

    if [ "${DELETED_COUNT}" -gt 0 ]; then
        log "Deleted ${DELETED_COUNT} old backup(s)"
    else
        log "No old backups to delete"
    fi
}

# Verify backup integrity
verify_backup() {
    log "Verifying backup integrity: ${BACKUP_FILE}"

    if gzip -t "${BACKUP_FILE}"; then
        log "Backup verification successful"
        return 0
    else
        log "ERROR: Backup verification failed"
        return 1
    fi
}

# Main backup process
main() {
    log "=== Backup process started ==="

    if perform_backup; then
        if verify_backup; then
            cleanup_old_backups
            log "=== Backup process completed successfully ==="
        else
            log "=== Backup process failed: verification error ==="
            exit 1
        fi
    else
        log "=== Backup process failed: backup error ==="
        exit 1
    fi
}

# Run main function
main

# Create crontab entry for daily backup at 3:00 AM
# This is executed when the container starts
if [ "$1" = "init-cron" ]; then
    log "Initializing cron job for daily backup at 3:00 AM"

    # Create crontab file
    echo "0 3 * * * /backup.sh" > /etc/crontabs/root

    log "Cron job initialized"
    log "Next backup scheduled for 3:00 AM"
fi
