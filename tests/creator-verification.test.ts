import { describe, it, expect, beforeEach } from "vitest"

// Mock implementation for testing Clarity contracts
// Note: This is a simplified mock for testing logic, not actual blockchain interaction

// Mock for tx-sender and principals
const ADMIN = "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7"
const USER1 = "SP1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28NRRZDYJ"
const USER2 = "SP3GWX3NE58KXHESRYE4DYQ1S31PQJTCRXB3PE9SB"
const USER3 = "SPJW1XE278YMCEYMXB8ZFGJMH8ZVAAEDP2S2PJYG"

// Mock state
let mockState = {
  admin: ADMIN,
  contentCreators: new Map<string, string>(),
}

// Mock contract functions
const creatorVerification = {
  registerContent: (sender: string, contentId: string) => {
    if (sender !== mockState.admin) {
      return { type: "err", value: 100 }
    }
    mockState.contentCreators.set(contentId, sender)
    return { type: "ok", value: true }
  },
  
  transferContent: (sender: string, contentId: string, newOwner: string) => {
    const currentOwner = mockState.contentCreators.get(contentId)
    if (!currentOwner) {
      return { type: "err", value: 101 }
    }
    if (sender !== currentOwner) {
      return { type: "err", value: 102 }
    }
    mockState.contentCreators.set(contentId, newOwner)
    return { type: "ok", value: true }
  },
  
  verifyCreator: (contentId: string, creator: string) => {
    const registeredCreator = mockState.contentCreators.get(contentId)
    if (registeredCreator && registeredCreator === creator) {
      return { type: "ok", value: true }
    }
    return { type: "err", value: 104 }
  },
  
  setAdmin: (sender: string, newAdmin: string) => {
    if (sender !== mockState.admin) {
      return { type: "err", value: 105 }
    }
    mockState.admin = newAdmin
    return { type: "ok", value: true }
  },
}

describe("Creator Verification Contract", () => {
  beforeEach(() => {
    // Reset state before each test
    mockState = {
      admin: ADMIN,
      contentCreators: new Map<string, string>(),
    }
  })
  
  describe("Content Registration", () => {
    it("should register content when called by admin", () => {
      const result = creatorVerification.registerContent(ADMIN, "content-123")
      expect(result.type).toBe("ok")
      expect(mockState.contentCreators.get("content-123")).toBe(ADMIN)
    })
    
    it("should fail to register content when called by non-admin", () => {
      const result = creatorVerification.registerContent(USER1, "content-123")
      expect(result.type).toBe("err")
      expect(result.value).toBe(100)
    })
    
    it("should allow registering multiple content IDs", () => {
      creatorVerification.registerContent(ADMIN, "content-123")
      creatorVerification.registerContent(ADMIN, "content-456")
      
      expect(mockState.contentCreators.get("content-123")).toBe(ADMIN)
      expect(mockState.contentCreators.get("content-456")).toBe(ADMIN)
    })
    
    it("should overwrite existing content registration if same ID is used", () => {
      creatorVerification.registerContent(ADMIN, "content-123")
      expect(mockState.contentCreators.get("content-123")).toBe(ADMIN)
      
      // Change admin to USER1
      creatorVerification.setAdmin(ADMIN, USER1)
      
      // Register same content ID with new admin
      const result = creatorVerification.registerContent(USER1, "content-123")
      expect(result.type).toBe("ok")
      expect(mockState.contentCreators.get("content-123")).toBe(USER1)
    })
  })
  
  describe("Content Transfer", () => {
    it("should transfer content ownership", () => {
      // First register content
      creatorVerification.registerContent(ADMIN, "content-123")
      
      // Then transfer it
      const result = creatorVerification.transferContent(ADMIN, "content-123", USER1)
      expect(result.type).toBe("ok")
      expect(mockState.contentCreators.get("content-123")).toBe(USER1)
    })
    
    it("should fail to transfer content if not owner", () => {
      // First register content
      creatorVerification.registerContent(ADMIN, "content-123")
      
      // Try to transfer as non-owner
      const result = creatorVerification.transferContent(USER1, "content-123", USER2)
      expect(result.type).toBe("err")
      expect(result.value).toBe(102)
    })
    
    it("should fail to transfer non-existent content", () => {
      const result = creatorVerification.transferContent(ADMIN, "non-existent", USER1)
      expect(result.type).toBe("err")
      expect(result.value).toBe(101)
    })
    
    it("should allow new owner to transfer content", () => {
      // Register and transfer content
      creatorVerification.registerContent(ADMIN, "content-123")
      creatorVerification.transferContent(ADMIN, "content-123", USER1)
      
      // New owner transfers to another user
      const result = creatorVerification.transferContent(USER1, "content-123", USER2)
      expect(result.type).toBe("ok")
      expect(mockState.contentCreators.get("content-123")).toBe(USER2)
    })
    
    it("should allow transferring back to original owner", () => {
      // Register and transfer content
      creatorVerification.registerContent(ADMIN, "content-123")
      creatorVerification.transferContent(ADMIN, "content-123", USER1)
      
      // Transfer back to original owner
      const result = creatorVerification.transferContent(USER1, "content-123", ADMIN)
      expect(result.type).toBe("ok")
      expect(mockState.contentCreators.get("content-123")).toBe(ADMIN)
    })
  })
  
  describe("Creator Verification", () => {
    it("should verify creator correctly", () => {
      // Register content
      creatorVerification.registerContent(ADMIN, "content-123")
      
      // Verify correct creator
      const result1 = creatorVerification.verifyCreator("content-123", ADMIN)
      expect(result1.type).toBe("ok")
      expect(result1.value).toBe(true)
      
      // Verify incorrect creator
      const result2 = creatorVerification.verifyCreator("content-123", USER1)
      expect(result2.type).toBe("err")
    })
    
    it("should verify new owner after transfer", () => {
      // Register and transfer content
      creatorVerification.registerContent(ADMIN, "content-123")
      creatorVerification.transferContent(ADMIN, "content-123", USER1)
      
      // Verify new owner
      const result1 = creatorVerification.verifyCreator("content-123", USER1)
      expect(result1.type).toBe("ok")
      expect(result1.value).toBe(true)
      
      // Verify old owner (should fail)
      const result2 = creatorVerification.verifyCreator("content-123", ADMIN)
      expect(result2.type).toBe("err")
    })
    
    it("should fail to verify creator for non-existent content", () => {
      const result = creatorVerification.verifyCreator("non-existent", ADMIN)
      expect(result.type).toBe("err")
    })
  })
  
  describe("Admin Management", () => {
    it("should change admin when called by current admin", () => {
      const result = creatorVerification.setAdmin(ADMIN, USER1)
      expect(result.type).toBe("ok")
      expect(mockState.admin).toBe(USER1)
    })
    
    it("should fail to change admin when called by non-admin", () => {
      const result = creatorVerification.setAdmin(USER1, USER2)
      expect(result.type).toBe("err")
      expect(result.value).toBe(105)
      expect(mockState.admin).toBe(ADMIN) // Admin should not change
    })
    
    it("should allow new admin to register content", () => {
      // Change admin
      creatorVerification.setAdmin(ADMIN, USER1)
      
      // New admin registers content
      const result = creatorVerification.registerContent(USER1, "content-456")
      expect(result.type).toBe("ok")
      expect(mockState.contentCreators.get("content-456")).toBe(USER1)
    })
    
    it("should prevent old admin from registering content", () => {
      // Change admin
      creatorVerification.setAdmin(ADMIN, USER1)
      
      // Old admin tries to register content
      const result = creatorVerification.registerContent(ADMIN, "content-456")
      expect(result.type).toBe("err")
      expect(result.value).toBe(100)
    })
    
    it("should allow chaining admin changes", () => {
      // First admin change
      creatorVerification.setAdmin(ADMIN, USER1)
      expect(mockState.admin).toBe(USER1)
      
      // Second admin change
      const result = creatorVerification.setAdmin(USER1, USER2)
      expect(result.type).toBe("ok")
      expect(mockState.admin).toBe(USER2)
    })
    
    it("should allow setting same admin again", () => {
      const result = creatorVerification.setAdmin(ADMIN, ADMIN)
      expect(result.type).toBe("ok")
      expect(mockState.admin).toBe(ADMIN)
    })
  })
  
  describe("Complex Scenarios", () => {
    it("should handle multiple content transfers correctly", () => {
      // Register content
      creatorVerification.registerContent(ADMIN, "content-123")
      
      // Transfer chain: ADMIN -> USER1 -> USER2 -> USER3 -> USER1
      creatorVerification.transferContent(ADMIN, "content-123", USER1)
      creatorVerification.transferContent(USER1, "content-123", USER2)
      creatorVerification.transferContent(USER2, "content-123", USER3)
      creatorVerification.transferContent(USER3, "content-123", USER1)
      
      // Verify final owner
      expect(mockState.contentCreators.get("content-123")).toBe(USER1)
      
      // Verify correct verification results
      expect(creatorVerification.verifyCreator("content-123", USER1).type).toBe("ok")
      expect(creatorVerification.verifyCreator("content-123", ADMIN).type).toBe("err")
      expect(creatorVerification.verifyCreator("content-123", USER2).type).toBe("err")
      expect(creatorVerification.verifyCreator("content-123", USER3).type).toBe("err")
    })
    
    it("should handle admin changes and content operations correctly", () => {
      // Initial admin registers content
      creatorVerification.registerContent(ADMIN, "content-123")
      
      // Change admin
      creatorVerification.setAdmin(ADMIN, USER1)
      
      // New admin registers content
      creatorVerification.registerContent(USER1, "content-456")
      
      // Original admin can still transfer their content
      creatorVerification.transferContent(ADMIN, "content-123", USER2)
      
      // Verify all states
      expect(mockState.admin).toBe(USER1)
      expect(mockState.contentCreators.get("content-123")).toBe(USER2)
      expect(mockState.contentCreators.get("content-456")).toBe(USER1)
      
      // New admin can't transfer content they don't own
      const result = creatorVerification.transferContent(USER1, "content-123", USER3)
      expect(result.type).toBe("err")
    })
  })
})

