declare module "map-stream" {
    import ReadWriteStream = NodeJS.ReadWriteStream;
    import {StreamMapper} from "map-stream";

    declare namespace map {
        declare type StreamMapper<T, R> = (data: T, callback: StreamMapperCallback<R>) => void;

        declare type StreamMapperCallback<R> = (error?: any, newData?: R) => void;
    }

    declare function map<T>(mapper: StreamMapper<T>): ReadWriteStream;

    export = map;
}
