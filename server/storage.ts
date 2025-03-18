import { users, type User, type InsertUser, type DownloadHistory, type InsertDownloadHistory } from "@shared/schema";

// modify the interface with any CRUD methods
// you might need
export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getDownloadHistory(): Promise<DownloadHistory[]>;
  addToDownloadHistory(downloadInfo: InsertDownloadHistory): Promise<DownloadHistory>;
  clearDownloadHistory(): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private downloads: Map<number, DownloadHistory>;
  private userId: number;
  private downloadId: number;

  constructor() {
    this.users = new Map();
    this.downloads = new Map();
    this.userId = 1;
    this.downloadId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getDownloadHistory(): Promise<DownloadHistory[]> {
    // Sort by creation date, newest first
    return Array.from(this.downloads.values()).sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  async addToDownloadHistory(downloadInfo: InsertDownloadHistory): Promise<DownloadHistory> {
    const id = this.downloadId++;
    const createdAt = new Date();
    
    // Ensure all fields match the DownloadHistory type
    const downloadHistoryItem: DownloadHistory = {
      id,
      createdAt,
      url: downloadInfo.url,
      title: downloadInfo.title,
      thumbnail: downloadInfo.thumbnail || null,
      format: downloadInfo.format,
      formatLabel: downloadInfo.formatLabel,
      duration: downloadInfo.duration || null,
      fileSize: downloadInfo.fileSize || null,
      fileName: downloadInfo.fileName,
      downloadPath: downloadInfo.downloadPath
    };
    
    this.downloads.set(id, downloadHistoryItem);
    return downloadHistoryItem;
  }

  async clearDownloadHistory(): Promise<void> {
    this.downloads.clear();
  }
}

export const storage = new MemStorage();
