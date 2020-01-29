
declare module 'multi-progress' {
  import * as progressBar from 'progress';

  namespace MultiProgress {

  }
  
  class MultiProgress {
    constructor(writeStream: NodeJS.WriteStream);
    newBar(schema: string, options: progressBar.ProgressBarOptions): ProgressBar;
    terminate(): void;
    move(index: number): void;
    tick(index: number, value: any, options?: any): void;
    update(index: number, value: any, options?: any): void;
  }

  export = MultiProgress;
}
