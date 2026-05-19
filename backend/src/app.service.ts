import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface ProductVersion {
  name: string;
  version: string;
}

@Injectable()
export class AppService {
  private readonly productVersion: ProductVersion;

  constructor() {
    const packageJson = JSON.parse(
      readFileSync(join(process.cwd(), 'package.json'), 'utf-8'),
    ) as { name: string; version: string };

    this.productVersion = {
      name: packageJson.name,
      version: packageJson.version,
    };
  }

  getHello(): string {
    return 'Hello World!';
  }

  getProductVersion(): ProductVersion {
    return this.productVersion;
  }
}
