;; Creator Verification Contract
;; This contract validates ownership of original content

(define-data-var admin principal tx-sender)

;; Map of content-id to creator principal
(define-map content-creators (string-ascii 64) principal)

;; Register new content
(define-public (register-content (content-id (string-ascii 64)))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u100))
    (ok (map-set content-creators content-id tx-sender))
  )
)

;; Transfer content ownership
(define-public (transfer-content (content-id (string-ascii 64)) (new-owner principal))
  (let ((current-owner (unwrap! (map-get? content-creators content-id) (err u101))))
    (asserts! (is-eq tx-sender current-owner) (err u102))
    (ok (map-set content-creators content-id new-owner))
  )
)

;; Verify content creator
(define-read-only (verify-creator (content-id (string-ascii 64)) (creator principal))
  (let ((registered-creator (map-get? content-creators content-id)))
    (if (and (is-some registered-creator) (is-eq (unwrap! registered-creator (err u103)) creator))
      (ok true)
      (err u104)
    )
  )
)

;; Set new admin
(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u105))
    (ok (var-set admin new-admin))
  )
)

