import { Injectable, HttpException, HttpStatus, Logger, Inject } from '@nestjs/common';
import axios from 'axios';
import Redis from 'ioredis';

@Injectable()
export class YoutubeService {
  private readonly logger = new Logger(YoutubeService.name);
  private readonly apiKey = process.env.YOUTUBE_API_KEY;
  private readonly baseUrl = 'https://www.googleapis.com/youtube/v3';

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async searchVideos(query: string, pageToken?: string) {
    // Try cache if Redis is available
    if (this.redis) {
      try {
        const cacheKey = `yt_search:${query}:${pageToken || '1'}`;
        const cachedData = await this.redis.get(cacheKey);

        if (cachedData) {
          this.logger.log(`Cache hit for query: ${query}`);
          return JSON.parse(cachedData);
        }
      } catch (err) {
        this.logger.warn('Redis cache unavailable, skipping cache read');
      }
    }

    this.logger.log(`Fetching from YouTube API: ${query}`);
    try {
      const { data } = await axios.get(`${this.baseUrl}/search`, {
        params: {
          part: 'snippet',
          q: query,
          type: 'video',
          maxResults: 20,
          pageToken: pageToken,
          key: this.apiKey,
        },
      });

      const results = data.items.map((item: any) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.high.url,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
      }));

      const response = {
        results,
        nextPageToken: data.nextPageToken,
      };

      // Cache for 24 hours if Redis is available
      if (this.redis) {
        try {
          const cacheKey = `yt_search:${query}:${pageToken || '1'}`;
          await this.redis.set(cacheKey, JSON.stringify(response), 'EX', 86400);
        } catch (err) {
          this.logger.warn('Redis cache unavailable, skipping cache write');
        }
      }

      return response;
    } catch (error: any) {
      this.logger.error(`YouTube API error: ${error.response?.data?.error?.message || error.message}`);
      throw new HttpException(
        error.response?.data?.error?.message || 'Failed to fetch videos from YouTube',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getVideoDetails(videoId: string) {
    if (this.redis) {
      try {
        const cacheKey = `yt_video:${videoId}`;
        const cachedData = await this.redis.get(cacheKey);

        if (cachedData) {
          return JSON.parse(cachedData);
        }
      } catch (err) {
        this.logger.warn('Redis cache unavailable, skipping cache read');
      }
    }

    try {
      const { data } = await axios.get(`${this.baseUrl}/videos`, {
        params: {
          part: 'snippet,contentDetails',
          id: videoId,
          key: this.apiKey,
        },
      });

      const video = data.items[0];
      if (!video) {
        throw new HttpException('Video not found', HttpStatus.NOT_FOUND);
      }

      const result = {
        id: video.id,
        title: video.snippet.title,
        duration: video.contentDetails.duration,
        thumbnail: video.snippet.thumbnails.high.url,
      };

      if (this.redis) {
        try {
          const cacheKey = `yt_video:${videoId}`;
          await this.redis.set(cacheKey, JSON.stringify(result), 'EX', 86400);
        } catch (err) {
          this.logger.warn('Redis cache unavailable, skipping cache write');
        }
      }
      return result;
    } catch (error: any) {
      throw new HttpException(
        error.response?.data?.error?.message || 'Failed to fetch video details',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}