// Create a Text parameter DataFolder pointing to the processed data directory.
// Query name: FactSales. Use locale en-US for the dot decimal separator.
let
    Source = Csv.Document(File.Contents(DataFolder & "/fact_sales.csv"),[Delimiter=",",Encoding=65001,QuoteStyle=QuoteStyle.Csv]),
    Headers = Table.PromoteHeaders(Source,[PromoteAllScalars=true]),
    Types = Table.TransformColumnTypes(Headers,{{"OrderId", type text},{"Date", type date},{"Category",type text},{"Region",type text},{"Channel",type text},{"Quantity",Int64.Type},{"Revenue",Currency.Type},{"Cost",Currency.Type},{"Profit",Currency.Type}},"en-US")
in Types

// Query name: DimDate (create separately).
let
    Source = Csv.Document(File.Contents(DataFolder & "/dim_date.csv"),[Delimiter=",",Encoding=65001,QuoteStyle=QuoteStyle.Csv]),
    Headers = Table.PromoteHeaders(Source,[PromoteAllScalars=true]),
    Types = Table.TransformColumnTypes(Headers,{{"Date",type date},{"Year",Int64.Type},{"Month",Int64.Type},{"MonthLabel",type text}},"en-US")
in Types
