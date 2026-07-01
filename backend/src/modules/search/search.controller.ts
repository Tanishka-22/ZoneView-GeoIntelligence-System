import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchDto } from './dto/search.dto';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(@Query() dto: SearchDto) {
    const result = await this.searchService.search(dto);

    return {
      success: true,
      message: 'Search completed successfully',
      data: result,
    };
  }

  @Get('suggestions')
  async suggestions(@Query('q') q: string) {
    const suggestions = await this.searchService.suggestions(q ?? '');

    return {
      success: true,
      message: 'Suggestions fetched successfully',
      data: { suggestions },
    };
  }
}