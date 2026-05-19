import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { YoutubeService } from './youtube.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('youtube')
export class YoutubeController {
  constructor(private readonly youtubeService: YoutubeService) {}

  @Get('search')
  @UseGuards(JwtAuthGuard)
  async search(@Query('q') q: string, @Query('pageToken') pageToken?: string) {
    return this.youtubeService.searchVideos(q, pageToken);
  }

  @Get('details')
  @UseGuards(JwtAuthGuard)
  async getDetails(@Query('id') id: string) {
    return this.youtubeService.getVideoDetails(id);
  }
}
